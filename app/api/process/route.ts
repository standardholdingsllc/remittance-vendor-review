import { NextRequest, NextResponse } from 'next/server'
import csv from 'csv-parser'
import * as XLSX from 'xlsx'
import { Readable } from 'stream'

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

interface ProcessedTransaction {
  customerId: string
  vendor: string
  totalAmount: number
  totalInterchange: number
  transactionCount: number
  interchangeRate: number
  transactionsWithInterchange: number
  amountWithInterchange: number
}

interface VendorSummary {
  vendor: string
  transactionVolume: number
  totalAmount: number
  totalInterchange: number
  avgInterchangeRate: number
  transactionsWithInterchange: number
  amountWithInterchange: number
}

function parseAmount(amount: string): number {
  return parseFloat(amount.replace(/[$,]/g, '')) || 0
}

function isNonRemittanceService(summary: string): boolean {
  // List of non-remittance service patterns to exclude completely
  const nonRemittancePatterns = [
    'APPLE COM BILL',
    'APPLE CASH',
    'Disney Plus',
    'SpotifyUS',
    'METRO BY T MOBIL',
    'SIE PLAYSTATIONN',
    'PROGRESSIVE LEAS',
    'PAYPAL',
    'Chime',
    'PCA*SKY DANCER CASINO',
    'CASH APP'
  ]
  
  const summaryUpper = summary.toUpperCase()
  
  return nonRemittancePatterns.some(pattern => 
    summaryUpper.includes(pattern.toUpperCase())
  )
}

function extractVendorName(summary: string): string {
  // First check if it's a non-remittance service (should be filtered out)
  if (isNonRemittanceService(summary)) {
    return null // Will be filtered out
  }
  
  // Known remittance providers
  const vendors = [
    'RIA Financial Services',
    'Ria Money Transfer',
    'RMTLY',
    'Remitly',
    'Felix Pago',
    'Taptap Send',
    'TapTap Send',
    'BOSS MONEY',
    'BOSSREVOLUTIONMONEYXFE',
    'PANGEA MONEY TRANSFER',
    'WorldRemit',
    'WU DIGITAL USA',
    'XOOM',
    'ASTRA*MyBambu',
    'MONEYGRAM US ONLINE',
    'MoneyGram',
    'VIAMERICAS',
    'SERVICIO UNITELLER',
    'UNITELLER',
    'MAXITRANSFERS',
    'OMN*MONEY TRANSF',
    'PNM*Tornado Bus'
  ]
  
  const summaryUpper = summary.toUpperCase()
  
  for (const vendor of vendors) {
    if (summaryUpper.includes(vendor.toUpperCase())) {
      // Normalize vendor names
      if (vendor.includes('RIA') || vendor.includes('Ria')) return 'RIA'
      if (vendor.includes('RMTLY') || vendor.includes('Remitly')) return 'Remitly'
      if (vendor.includes('Felix')) return 'Felix Pago'
      if (vendor.includes('Taptap') || vendor.includes('TapTap')) return 'TapTap Send'
      if (vendor.includes('BOSS')) return 'Boss Money'
      if (vendor.includes('PANGEA')) return 'Pangea'
      if (vendor.includes('WorldRemit')) return 'WorldRemit'
      if (vendor.includes('WU DIGITAL')) return 'Western Union'
      if (vendor.includes('XOOM')) return 'Xoom'
      if (vendor.includes('ASTRA') || vendor.includes('MyBambu')) return 'MyBambu'
      if (vendor.includes('MONEYGRAM') || vendor.includes('MoneyGram')) return 'MoneyGram'
      if (vendor.includes('VIAMERICAS')) return 'Viamericas'
      if (vendor.includes('UNITELLER')) return 'Uniteller'
      if (vendor.includes('MAXITRANSFERS')) return 'MaxiTransfers'
      if (vendor.includes('OMN*MONEY TRANSF')) return 'Omni Money Transfer'
      if (vendor.includes('PNM*Tornado Bus')) return 'Tornado Bus'
      return vendor
    }
  }
  
  // If we reach here, it's an unknown vendor (potential new remittance provider)
  return 'Unknown Vendor'
}

function categorizeVendors(transactions: Transaction[]): {
  approved: ProcessedTransaction[]
  problem: ProcessedTransaction[]
  vendorSummary: VendorSummary[]
} {
  const customerVendorMap = new Map<string, Map<string, ProcessedTransaction>>()
  const vendorSummaryMap = new Map<string, VendorSummary>()

  // Process each transaction
  transactions.forEach(transaction => {
    if (transaction.direction !== 'Debit') return // Only process debit transactions
    
    const vendor = extractVendorName(transaction.summary)
    if (vendor === null) return // Skip non-remittance services completely
    
    const amount = parseAmount(transaction.amount)
    const interchange = parseAmount(transaction.interchange)
    const hasInterchange = transaction.interchange && transaction.interchange.trim() !== ''
    
    // Update customer-vendor mapping
    if (!customerVendorMap.has(transaction.customerId)) {
      customerVendorMap.set(transaction.customerId, new Map())
    }
    
    const customerVendors = customerVendorMap.get(transaction.customerId)!
    
    if (!customerVendors.has(vendor)) {
      customerVendors.set(vendor, {
        customerId: transaction.customerId,
        vendor,
        totalAmount: 0,
        totalInterchange: 0,
        transactionCount: 0,
        interchangeRate: 0,
        transactionsWithInterchange: 0,
        amountWithInterchange: 0
      })
    }
    
    const customerVendor = customerVendors.get(vendor)!
    customerVendor.totalAmount += amount
    customerVendor.transactionCount += 1
    
    // Only include transactions with actual interchange data for rate calculation
    if (hasInterchange) {
      customerVendor.totalInterchange += interchange
      customerVendor.transactionsWithInterchange += 1
      customerVendor.amountWithInterchange += amount
    }
    
    // Calculate interchange rate only based on transactions that have interchange data
    customerVendor.interchangeRate = customerVendor.amountWithInterchange > 0 ? 
      (customerVendor.totalInterchange / customerVendor.amountWithInterchange) * 100 : 0
    
    // Update vendor summary
    if (!vendorSummaryMap.has(vendor)) {
      vendorSummaryMap.set(vendor, {
        vendor,
        transactionVolume: 0,
        totalAmount: 0,
        totalInterchange: 0,
        avgInterchangeRate: 0,
        transactionsWithInterchange: 0,
        amountWithInterchange: 0
      })
    }
    
    const vendorSummary = vendorSummaryMap.get(vendor)!
    vendorSummary.transactionVolume += 1
    vendorSummary.totalAmount += amount
    
    if (hasInterchange) {
      vendorSummary.totalInterchange += interchange
      vendorSummary.transactionsWithInterchange += 1
      vendorSummary.amountWithInterchange += amount
    }
    
    // Calculate average interchange rate only based on transactions that have interchange data
    vendorSummary.avgInterchangeRate = vendorSummary.amountWithInterchange > 0 ? 
      (vendorSummary.totalInterchange / vendorSummary.amountWithInterchange) * 100 : 0
  })

  // Flatten customer-vendor data
  const allCustomerVendors: ProcessedTransaction[] = []
  customerVendorMap.forEach(vendorMap => {
    vendorMap.forEach(transaction => {
      allCustomerVendors.push(transaction)
    })
  })

  // Only categorize customers who have at least some transactions with interchange data
  const customersWithInterchange = allCustomerVendors.filter(t => t.transactionsWithInterchange > 0)
  
  // Create vendor summary array
  const vendorSummary = Array.from(vendorSummaryMap.values())
  
  // Define vendors that are ALWAYS problem vendors regardless of interchange rate
  const alwaysProblemVendors = [
    'Giromex',
    'Pangea', 
    'Remitly',
    'SendWave',
    'WorldRemit',
    'Western Union',
    'Xoom'
  ]
  
  // First, determine which vendors are approved/problem based on their OVERALL typical interchange rate
  const approvedVendors = new Set<string>()
  const problemVendors = new Set<string>()
  
  // Classify vendors based on their typical (overall average) interchange rate
  vendorSummary.forEach(vendor => {
    if (alwaysProblemVendors.includes(vendor.vendor)) {
      problemVendors.add(vendor.vendor)
    } else if (vendor.avgInterchangeRate > 0.3) {
      approvedVendors.add(vendor.vendor)
    } else {
      problemVendors.add(vendor.vendor)
    }
  })
  
  // Now classify ALL customers based on their vendor's overall classification
  const approved = customersWithInterchange.filter(t => approvedVendors.has(t.vendor))
  const problem = customersWithInterchange.filter(t => problemVendors.has(t.vendor))

  return { approved, problem, vendorSummary }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Parse CSV
    const buffer = Buffer.from(await file.arrayBuffer())
    const transactions: Transaction[] = []
    
    await new Promise((resolve, reject) => {
      const readable = new Readable()
      readable.push(buffer)
      readable.push(null)
      
      readable
        .pipe(csv())
        .on('data', (data) => {
          transactions.push(data)
        })
        .on('end', resolve)
        .on('error', reject)
    })

    // Process transactions
    const { approved, problem, vendorSummary } = categorizeVendors(transactions)

    // Create Excel files
    const approvedWb = XLSX.utils.book_new()
    const problemWb = XLSX.utils.book_new()
    const summaryWb = XLSX.utils.book_new()

    // Approved vendors sheet
    const approvedData = approved.map(t => ({
      'Customer ID': t.customerId,
      'Vendor': t.vendor,
      'Total Amount': `$${t.totalAmount.toFixed(2)}`,
      'Total Interchange': `$${t.totalInterchange.toFixed(2)}`,
      'Transaction Count': t.transactionCount,
      'Transactions with Interchange': t.transactionsWithInterchange,
      'Interchange Rate %': `${t.interchangeRate.toFixed(3)}%`
    }))
    const approvedWs = XLSX.utils.json_to_sheet(approvedData)
    XLSX.utils.book_append_sheet(approvedWb, approvedWs, 'Approved Vendors')

    // Problem vendors sheet
    const problemData = problem.map(t => ({
      'Customer ID': t.customerId,
      'Vendor': t.vendor,
      'Total Amount': `$${t.totalAmount.toFixed(2)}`,
      'Total Interchange': `$${t.totalInterchange.toFixed(2)}`,
      'Transaction Count': t.transactionCount,
      'Transactions with Interchange': t.transactionsWithInterchange,
      'Interchange Rate %': `${t.interchangeRate.toFixed(3)}%`
    }))
    const problemWs = XLSX.utils.json_to_sheet(problemData)
    XLSX.utils.book_append_sheet(problemWb, problemWs, 'Problem Vendors')

    // Vendor summary sheet
    const summaryData = vendorSummary.map(v => ({
      'Vendor Name': v.vendor,
      'Transaction Volume': v.transactionVolume,
      'Transactions with Interchange': v.transactionsWithInterchange,
      'Total Amount': `$${v.totalAmount.toFixed(2)}`,
      'Total Interchange': `$${v.totalInterchange.toFixed(2)}`,
      'Average Interchange Rate %': `${v.avgInterchangeRate.toFixed(3)}%`
    }))
    const summaryWs = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(summaryWb, summaryWs, 'Vendor Summary')

    // Convert to base64 for download
    const approvedBuffer = XLSX.write(approvedWb, { type: 'buffer', bookType: 'xlsx' })
    const problemBuffer = XLSX.write(problemWb, { type: 'buffer', bookType: 'xlsx' })
    const summaryBuffer = XLSX.write(summaryWb, { type: 'buffer', bookType: 'xlsx' })

    const approvedBase64 = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${approvedBuffer.toString('base64')}`
    const problemBase64 = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${problemBuffer.toString('base64')}`
    const summaryBase64 = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${summaryBuffer.toString('base64')}`

    // Generate current date for zip filename
    const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    return NextResponse.json({
      success: true,
      downloadLinks: [approvedBase64, problemBase64, summaryBase64],
      fileNames: [
        'approved-vendors-customers.xlsx',
        'problem-vendors-customers.xlsx', 
        'vendor-summary.xlsx'
      ],
      zipFileName: `vendor-review-${currentDate}.zip`,
      stats: {
        totalTransactions: transactions.length,
        approvedCustomers: approved.length,
        problemCustomers: problem.length,
        totalVendors: vendorSummary.length,
        filteredOutNonRemittance: transactions.filter(t => 
          t.direction === 'Debit' && extractVendorName(t.summary) === null
        ).length
      }
    })

  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
} 