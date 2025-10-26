# 🌿 Basil - Personal Finance Tracker

**Basil** is a privacy-focused personal finance tracker that keeps your financial data completely local. No cloud storage, no data sharing, no tracking - just you and your finances.

## ✨ Features

### 💰 **Smart Transaction Management**
- **Manual Entry**: Quick transaction input with intelligent category suggestions
- **CSV Import**: Smart import wizard that auto-detects columns from bank exports
- **Duplicate Detection**: Automatically identifies and handles duplicate transactions
- **Bulk Operations**: Group similar transactions for efficient categorization

### 📊 **Powerful Analytics**  
- **Visual Charts**: Interactive spending trends and category breakdowns using Recharts
- **Budget Tracking**: Set and monitor budgets with progress indicators
- **Monthly Summaries**: Clear overview of income, expenses, and trends
- **Category Insights**: Detailed analysis of spending patterns

### 🛡️ **Privacy First**
- **100% Local Storage**: All data stays on your device using localStorage
- **No Servers**: No data transmission, no accounts, no cloud dependencies
- **Offline Ready**: Works completely offline after initial load
- **Export Control**: Export your data anytime in CSV format

### 🎨 **Modern Experience**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme switching based on system preference
- **Fast Performance**: Built with React 19 and Vite for instant interactions
- **Accessible**: Full keyboard navigation and screen reader support

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/basil.git
   cd basil
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser** to `http://localhost:5173`

## 📋 Usage Guide

### Getting Started with Transactions

1. **Manual Entry**: Click the "+" button to add transactions manually
2. **CSV Import**: Use the "Import" feature to bulk import from your bank
   - Export CSV from your online banking
   - Upload the file and let Basil auto-detect columns
   - Review and categorize grouped transactions
   - Import with confidence thanks to duplicate detection

### Managing Your Budget

1. Navigate to the **Budget** tab
2. Set spending limits for each category
3. Track your progress with visual indicators
4. Get insights on overspending and trends

### Analyzing Your Finances

1. Visit the **Analytics** tab for visual breakdowns
2. View spending trends over time
3. Analyze category distributions
4. Monitor income vs. expenses

## 🧪 CSV Import Examples

Basil supports various bank CSV formats. Check out the sample files:
- `sample-bank-export.csv` - Example bank export format
- `sample-basil-export.csv` - Basil's export format for re-importing

### Supported CSV Formats
- **Date formats**: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
- **Amount formats**: $123.45, (123.45), -123.45, 1,234.56
- **Column detection**: Automatically detects Date, Description, Amount, Category columns
- **Bank formats**: Supports both single Amount column and separate Debit/Credit columns

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run pretty` - Format code with Prettier

### Project Structure

```
src/
├── components/           # React components
│   ├── import-wizard/   # Modular CSV import components
│   ├── Budget.tsx       # Budget management
│   ├── Dashboard.tsx    # Main dashboard
│   └── ...
├── utils/               # Utility functions
│   ├── smart-import/    # Modular CSV processing
│   ├── storage.ts       # localStorage management
│   └── currency.ts      # Currency formatting
├── types/               # TypeScript type definitions
└── test/                # Test utilities
```

### Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: CSS Modules with responsive design
- **Charts**: Recharts for data visualization  
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + Prettier
- **Date Handling**: date-fns

### Quality Assurance

- **116 comprehensive tests** with high coverage
- **Type safety** with TypeScript throughout
- **Accessibility** testing and compliance
- **Performance** optimization with Vite
- **Code quality** enforced with ESLint and Prettier

## 🔒 Privacy & Security

Basil is designed with privacy as the top priority:

- **No data collection**: Zero telemetry or analytics
- **No external connections**: Works completely offline
- **Local storage only**: Data never leaves your device
- **No accounts**: No sign-up, login, or user tracking
- **Export freedom**: Your data, your control

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **Vite** for the lightning-fast build tool
- **Recharts** for beautiful data visualization
- **Lucide** for the clean icon set

---

**Made with ❤️ for financial privacy and control**
