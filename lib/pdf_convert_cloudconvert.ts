import crypto from 'crypto'

type CloudConvertJob = {
  id: string
  status: 'waiting' | 'processing' | 'finished' | 'error'
  tasks: Array<{ name: string; status: string; result?: any; code?: string; message?: string }>
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

async function ccFetch(path: string, init: RequestInit = {}) {
  const apiKey = requireEnv('CLOUDCONVERT_API_KEY')
  const res = await fetch(`https://api.cloudconvert.com/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`CloudConvert API error (${res.status}): ${JSON.stringify(json)}`)
  }
  return json
}

async function uploadToSignedUrl(url: string, file: Buffer, contentType: string) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(file.length),
    },
    // Next/TS types can be picky about Buffer as BodyInit; Uint8Array is accepted.
    body: new Uint8Array(file),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`CloudConvert upload failed (${res.status}): ${t}`)
  }
}

async function downloadAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`CloudConvert download failed (${res.status}): ${t}`)
  }
  const arr = await res.arrayBuffer()
  return Buffer.from(arr)
}

export async function pdfFirstPageToPngDataUrl(pdfBuffer: Buffer): Promise<string> {
  // CloudConvert job: import/upload -> convert(pdf->png) -> export/url
  // We request page 1 only.

  const job = await ccFetch('/jobs', {
    method: 'POST',
    body: JSON.stringify({
      tasks: {
        'import-pdf': {
          operation: 'import/upload',
        },
        'convert-to-png': {
          operation: 'convert',
          input: 'import-pdf',
          input_format: 'pdf',
          output_format: 'png',
          // Page selection (CloudConvert supports this for PDF conversions; if the
          // parameter name differs, we'll adjust based on their job builder output.)
          pages: '1',
        },
        'export-result': {
          operation: 'export/url',
          input: 'convert-to-png',
        },
      },
    }),
  })

  const data = job?.data as CloudConvertJob
  if (!data?.id) throw new Error('CloudConvert: missing job id')

  // Find import task for signed upload URL
  const importTask = data.tasks.find((t) => t.name === 'import-pdf')
  const uploadForm = importTask?.result?.form
  if (!uploadForm?.url || !uploadForm?.parameters) {
    // Some responses use a different shape; fetch tasks if needed
    const job2 = await ccFetch(`/jobs/${data.id}`)
    const data2 = job2?.data as CloudConvertJob
    const importTask2 = data2.tasks.find((t) => t.name === 'import-pdf')
    const uf2 = importTask2?.result?.form
    if (!uf2?.url || !uf2?.parameters) {
      throw new Error('CloudConvert: could not get signed upload URL')
    }
    // Upload via form-style to S3 is annoying in serverless; CloudConvert also returns
    // a direct PUT url sometimes. Prefer PUT when available.
  }

  // CloudConvert import/upload returns an S3 form; easiest is to request a signed PUT.
  // CloudConvert also supports uploading via /tasks/:id/upload? but their v2 uses the form.
  // We'll do the multipart POST to the form URL.
  async function uploadViaForm(url: string, parameters: Record<string, string>) {
    const boundary = `----receiptflow-${crypto.randomBytes(12).toString('hex')}`
    const chunks: Buffer[] = []
    const push = (s: string | Buffer) => chunks.push(Buffer.isBuffer(s) ? s : Buffer.from(s))

    for (const [k, v] of Object.entries(parameters)) {
      push(`--${boundary}\r\n`)
      push(`Content-Disposition: form-data; name=\"${k}\"\r\n\r\n`)
      push(`${v}\r\n`)
    }

    push(`--${boundary}\r\n`)
    push(`Content-Disposition: form-data; name=\"file\"; filename=\"document.pdf\"\r\n`)
    push(`Content-Type: application/pdf\r\n\r\n`)
    push(pdfBuffer)
    push(`\r\n--${boundary}--\r\n`)

    const body = Buffer.concat(chunks)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`CloudConvert form upload failed (${res.status}): ${t}`)
    }
  }

  // Refresh job to get import form reliably
  const jobFull = await ccFetch(`/jobs/${data.id}`)
  const dataFull = jobFull?.data as CloudConvertJob
  const importT = dataFull.tasks.find((t) => t.name === 'import-pdf')
  const form = importT?.result?.form
  if (!form?.url || !form?.parameters) throw new Error('CloudConvert: missing upload form')
  await uploadViaForm(form.url, form.parameters)

  // Poll until finished
  const start = Date.now()
  while (true) {
    const j = await ccFetch(`/jobs/${data.id}`)
    const d = j?.data as CloudConvertJob
    if (d.status === 'error') {
      throw new Error(`CloudConvert job error: ${JSON.stringify(d.tasks)}`)
    }
    if (d.status === 'finished') {
      const exportTask = d.tasks.find((t) => t.name === 'export-result')
      const files = exportTask?.result?.files
      const first = Array.isArray(files) ? files[0] : null
      const fileUrl = first?.url
      if (!fileUrl) throw new Error('CloudConvert: missing export file url')
      const png = await downloadAsBuffer(fileUrl)
      return `data:image/png;base64,${png.toString('base64')}`
    }
    if (Date.now() - start > 60_000) throw new Error('CloudConvert timed out waiting for job')
    await new Promise((r) => setTimeout(r, 1200))
  }
}
