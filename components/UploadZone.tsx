'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, File, X } from 'lucide-react'
import { useSupabase } from './SupabaseProvider'

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
}

export function UploadZone() {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const { user } = useSupabase()

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      // Update status to uploading
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'uploading' } : f)
      )

      // Create form data
      const formData = new FormData()
      formData.append('file', uploadingFile.file)

      // Upload to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()

      // Update status to processing
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'processing', progress: 100 } : f)
      )

      // Start extraction
      await extractData(data.documentId, uploadingFile.id)

    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(f => f.id === uploadingFile.id ? { ...f, status: 'error' } : f)
      )
    }
  }

  const extractData = async (documentId: string, fileId: string) => {
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })

      if (!response.ok) {
        throw new Error('Extraction failed')
      }

      setUploadingFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'completed' } : f)
      )

      // Remove from list after 3 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
      }, 3000)

    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, status: 'error' } : f)
      )
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'uploading' as const,
    }))

    setUploadingFiles(prev => [...prev, ...newFiles])

    // Upload each file
    newFiles.forEach(file => {
      uploadFile(file)
    })
  }, [user])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          or click to select files
        </p>
        <p className="mt-1 text-xs text-gray-400">
          PDF, PNG, JPG up to 10MB
        </p>
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.status === 'uploading' && 'Uploading...'}
                    {file.status === 'processing' && 'Extracting data...'}
                    {file.status === 'completed' && 'Done!'}
                    {file.status === 'error' && 'Error'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {file.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                {file.status === 'processing' && (
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                )}
                {file.status === 'completed' && (
                  <span className="text-green-600 text-xs">✓</span>
                )}
                {file.status === 'error' && (
                  <span className="text-red-600 text-xs">✗</span>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
