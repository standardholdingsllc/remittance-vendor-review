'use client'

import { useState } from 'react'

// Client-side zip functionality - using a CDN approach
declare global {
  interface Window {
    JSZip: any;
  }
}

interface Transaction {
  createdAt: string
  id: string
  type: string
  amount: string
  direction: string
  balance: string
  interchange: string
  summary: string
  customerId: string
  accountId: string
  counterpartyName: string
  counterpartyCustomer: string
  counterpartyAccount: string
  imad: string
  omad: string
  paymentId: string
  recurringPaymentId: string
  grossInterchange: string
  institutionId: string
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [downloadLinks, setDownloadLinks] = useState<string[]>([])
  const [fileNames, setFileNames] = useState<string[]>([])
  const [zipFileName, setZipFileName] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  const [message, setMessage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setMessage('')
      setDownloadLinks([])
      setFileNames([])
      setZipFileName('')
      setStats(null)
    }
  }

  const downloadAsZip = async () => {
    if (!window.JSZip) {
      setMessage('JSZip library not loaded. Please refresh the page and try again.')
      return
    }

    try {
      const zip = new window.JSZip()

      // Add each file to the zip
      for (let i = 0; i < downloadLinks.length; i++) {
        const link = downloadLinks[i]
        const fileName = fileNames[i]
        
        // Convert base64 to binary data
        const base64Data = link.split(',')[1]
        const binaryData = atob(base64Data)
        const bytes = new Uint8Array(binaryData.length)
        for (let j = 0; j < binaryData.length; j++) {
          bytes[j] = binaryData.charCodeAt(j)
        }
        
        zip.file(fileName, bytes)
      }

      // Generate the zip file
      const zipContent = await zip.generateAsync({ type: 'blob' })
      
      // Create download link
      const url = URL.createObjectURL(zipContent)
      const a = document.createElement('a')
      a.href = url
      a.download = zipFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error creating zip:', error)
      setMessage('Error creating zip file. Please try downloading files individually.')
    }
  }

  const handleProcess = async () => {
    if (!file) {
      setMessage('Please select a CSV file first')
      return
    }

    setProcessing(true)
    setMessage('Processing your transaction file...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process file')
      }

      const result = await response.json()
      
      if (result.success) {
        setDownloadLinks(result.downloadLinks)
        setFileNames(result.fileNames)
        setZipFileName(result.zipFileName)
        setStats(result.stats)
        setMessage('Processing complete! Download your files below.')
      } else {
        setMessage(result.error || 'An error occurred while processing')
      }
    } catch (error) {
      setMessage('Error processing file. Please try again.')
      console.error('Error:', error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Remittance Transaction Processor
          </h1>
          <p className="text-lg text-gray-600">
            Upload your weekly transaction CSV file to generate vendor reports
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Select Transaction CSV File
            </label>
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Selected file: <span className="font-medium">{file.name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={!file || processing}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Processing...' : 'Process Transaction File'}
          </button>

          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              downloadLinks.length > 0 ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          {downloadLinks.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Download Reports:</h3>
              
              {/* Stats display */}
              {stats && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Processing Summary:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>Total Transactions: {stats.totalTransactions}</div>
                    <div>Approved Customers: {stats.approvedCustomers}</div>
                    <div>Problem Customers: {stats.problemCustomers}</div>
                    <div>Total Vendors: {stats.totalVendors}</div>
                    <div>Non-Remittance Filtered: {stats.filteredOutNonRemittance}</div>
                  </div>
                </div>
              )}

              {/* Zip download button */}
              <button
                onClick={downloadAsZip}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                📦 Download All Files as ZIP ({zipFileName})
              </button>

              {/* Individual file downloads */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Or download individually:</h4>
                {downloadLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    download={fileNames[index]}
                    className="block bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center"
                  >
                    Download {fileNames[index]}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How it works:</h2>
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
              <p>Upload your weekly transaction CSV file (same format as Transactions.csv)</p>
            </div>
            <div className="flex items-start space-x-3">
               <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
               <p>The system automatically filters out non-remittance services (Apple Pay, Disney, etc.) and recognizes 17+ major remittance providers (RIA, Remitly, MoneyGram, Viamericas, etc.). Vendors are categorized by interchange rates (&gt;0.3% = approved, ≤0.3% = problem).</p>
             </div>
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
              <p>Download all 3 Excel files as a ZIP package or individually: Approved vendors, Problem vendors, and General vendor summary</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 