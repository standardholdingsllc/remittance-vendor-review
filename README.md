# Remittance Transaction Processor

A Next.js application that processes weekly transaction CSV files and generates vendor reports with interchange analysis.

## Features

- **CSV File Upload**: Upload weekly transaction CSV files in the same format as your business dashboard
- **Automatic Vendor Categorization**: Separates vendors into "approved" (>0.3% interchange) and "problem" (<0.3% interchange) categories
- **Customer Deduplication**: Combines multiple transactions per customer into single rows
- **Excel Report Generation**: Generates 3 downloadable Excel files:
  - Approved vendors customer breakdown
  - Problem vendors customer breakdown  
  - General vendor summary report

## CSV File Format

The application expects CSV files with the following columns:
- `createdAt`: Transaction date (ISO format)
- `id`: Transaction ID
- `type`: Transaction type (usually "cardTransaction")
- `amount`: Transaction amount (with $ and comma formatting)
- `direction`: Payment direction ("Debit" or "Credit")
- `balance`: Account balance after transaction
- `interchange`: Interchange amount (may be empty for recent transactions)
- `summary`: Vendor information (most important field)
- `customerId`: Customer identifier for deduplication
- `accountId`: Account identifier
- Additional fields: `counterpartyName`, `counterpartyCustomer`, `counterpartyAccount`, `imad`, `omad`, `paymentId`, `recurringPaymentId`, `grossInterchange`, `institutionId`

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to configure your deployment

## How It Works

1. **Upload**: Users upload their weekly transaction CSV file
2. **Processing**: The system:
   - Parses the CSV file
   - Extracts vendor names from the summary field
   - Calculates interchange rates for each customer-vendor combination
   - Categorizes vendors based on 0.3% interchange threshold
   - Deduplicates customers across multiple transactions
3. **Output**: Three Excel files are generated:
   - **Approved Vendors**: Customers with >0.3% interchange vendors
   - **Problem Vendors**: Customers with ≤0.3% interchange vendors
   - **Vendor Summary**: Overall statistics by vendor

## Supported Vendors

The system recognizes these remittance providers:
- RIA Financial Services / Ria Money Transfer
- Remitly (RMTLY)
- Felix Pago
- TapTap Send
- Boss Money / Boss Revolution
- Cash App
- Pangea Money Transfer
- WorldRemit
- Western Union (WU Digital)
- Xoom
- MyBambu (Astra)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **File Processing**: csv-parser for CSV parsing
- **Excel Generation**: xlsx library
- **Deployment**: Vercel

## File Structure

```
├── app/
│   ├── api/process/route.ts    # API endpoint for processing
│   ├── globals.css             # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page component
├── types/
│   └── react.d.ts             # TypeScript definitions
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

## Environment Variables

No environment variables are required for basic functionality.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 