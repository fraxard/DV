/**
 * DigiVirasat Asset Category Metadata Fields Configuration
 *
 * Defines the structured, type-specific metadata fields for each asset category.
 * These fields are stored in the existing PostgreSQL JSONB `assets.metadata` column.
 *
 * SECURITY RULE:
 * Absolutely NO fields for private keys, seed phrases, mnemonics, passwords,
 * API secrets, or secret keys are ever defined here.
 */

export const ASSET_CATEGORY_FIELDS = {
  property: {
    categoryKey: 'property',
    label: 'Property',
    description: 'Real estate, land, and physical property holdings',
    fields: [
      {
        key: 'propertyType',
        label: 'Property Type',
        type: 'select',
        options: [
          'Residential Apartment',
          'Independent Villa / House',
          'Commercial Office / Retail',
          'Agricultural Land',
          'Plot / Residential Land',
          'Industrial Property',
          'Other',
        ],
        placeholder: 'Select property type',
      },
      {
        key: 'address',
        label: 'Street Address',
        type: 'text',
        placeholder: 'House/Flat No., Building, Street',
      },
      {
        key: 'city',
        label: 'City',
        type: 'text',
        placeholder: 'e.g. Mumbai, Panaji, London',
      },
      {
        key: 'state',
        label: 'State / Province',
        type: 'text',
        placeholder: 'e.g. Maharashtra, Goa',
      },
      {
        key: 'postalCode',
        label: 'Postal Code / PIN',
        type: 'text',
        placeholder: 'e.g. 400001',
      },
      {
        key: 'ownershipType',
        label: 'Ownership Type',
        type: 'select',
        options: [
          'Sole Ownership',
          'Joint Ownership',
          'Inherited / Ancestral',
          'Leasehold',
          'Power of Attorney',
          'Other',
        ],
        placeholder: 'Select ownership structure',
      },
      {
        key: 'registrationNumber',
        label: 'Deed / Khata / Survey No.',
        type: 'text',
        placeholder: 'Deed, Survey, Khata or Document No.',
      },
      {
        key: 'area',
        label: 'Built-up Area / Plot Size',
        type: 'text',
        placeholder: 'e.g. 2,400 sq ft, 0.5 acres',
      },
      {
        key: 'purchaseDate',
        label: 'Purchase / Acquisition Date',
        type: 'date',
      },
      {
        key: 'purchasePrice',
        label: 'Original Purchase Price',
        type: 'text',
        placeholder: 'e.g. ₹45,00,000',
      },
      {
        key: 'currentValuation',
        label: 'Current Appraisal / Valuation',
        type: 'text',
        placeholder: 'e.g. ₹75,00,000',
      },
      {
        key: 'mortgageStatus',
        label: 'Mortgage / Loan Status',
        type: 'select',
        options: [
          'Freehold / Unencumbered',
          'Active Home Loan / Mortgage',
          'Loan Paid Off - NOC Pending',
          'Under Construction',
        ],
        placeholder: 'Select loan status',
      },
    ],
  },

  financial: {
    categoryKey: 'financial',
    label: 'Financial',
    description: 'Bank accounts, savings, deposits and financial holdings',
    fields: [
      {
        key: 'institution',
        label: 'Bank / Financial Institution',
        type: 'text',
        placeholder: 'e.g. HDFC Bank, State Bank of India, Vanguard',
      },
      {
        key: 'accountType',
        label: 'Account Type',
        type: 'select',
        options: [
          'Savings Account',
          'Current / Checking Account',
          'Fixed / Term Deposit',
          'Recurring Deposit',
          'Money Market Account',
          'Salary Account',
          'Other',
        ],
        placeholder: 'Select account type',
      },
      {
        key: 'accountReferenceMasked',
        label: 'Account Identifier (Masked)',
        type: 'text',
        placeholder: 'e.g. •••• 4821 or Account # ending',
      },
      {
        key: 'branch',
        label: 'Branch Name / Location',
        type: 'text',
        placeholder: 'e.g. MG Road Branch, Bengaluru',
      },
      {
        key: 'routingCode',
        label: 'IFSC / SWIFT / Routing Code',
        type: 'text',
        placeholder: 'e.g. HDFC0000123',
      },
      {
        key: 'accountHolder',
        label: 'Primary Account Holder',
        type: 'text',
        placeholder: 'e.g. John Doe (Single / Joint)',
      },
      {
        key: 'interestRate',
        label: 'Interest Rate (%)',
        type: 'text',
        placeholder: 'e.g. 7.25%',
      },
      {
        key: 'maturityDate',
        label: 'Maturity / Renewal Date',
        type: 'date',
      },
    ],
  },

  crypto: {
    categoryKey: 'crypto',
    label: 'Crypto',
    description: 'Digital currencies, tokens, wallets and exchange accounts',
    fields: [
      {
        key: 'assetName',
        label: 'Asset / Token Name',
        type: 'text',
        placeholder: 'e.g. Bitcoin (BTC), Ethereum (ETH), Solana',
      },
      {
        key: 'walletType',
        label: 'Wallet Type',
        type: 'select',
        options: [
          'Hardware Wallet (Ledger/Trezor)',
          'Self-Custody Mobile/Desktop (Metamask/Phantom)',
          'Cold Storage / Paper Wallet',
          'Exchange / Custodial Account',
          'Multi-Sig Safe',
          'Other',
        ],
        placeholder: 'Select custody type',
      },
      {
        key: 'walletAddress',
        label: 'Public Wallet Address',
        type: 'text',
        placeholder: 'e.g. bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        copyable: true,
      },
      {
        key: 'network',
        label: 'Blockchain Network',
        type: 'text',
        placeholder: 'e.g. Bitcoin Mainnet, Ethereum (ERC-20), Polygon',
      },
      {
        key: 'exchangePlatform',
        label: 'Exchange / Platform',
        type: 'text',
        placeholder: 'e.g. Binance, Coinbase, Kraken, CoinDCX',
      },
      {
        key: 'quantity',
        label: 'Holding Quantity / Balance',
        type: 'text',
        placeholder: 'e.g. 0.42 BTC, 4.5 ETH',
      },
      {
        key: 'purchaseDate',
        label: 'Acquisition Date',
        type: 'date',
      },
      {
        key: 'notes',
        label: 'Storage & Access Instructions',
        type: 'textarea',
        placeholder: 'e.g. Hardware key in home safe. Recovery instructions in bank locker. (Never enter secret keys or seed phrases!)',
      },
    ],
  },

  insurance: {
    categoryKey: 'insurance',
    label: 'Insurance',
    description: 'Policies, health, term and protection records',
    fields: [
      {
        key: 'provider',
        label: 'Insurance Provider / Underwriter',
        type: 'text',
        placeholder: 'e.g. LIC of India, HDFC Life, Prudential',
      },
      {
        key: 'policyNumber',
        label: 'Policy Number',
        type: 'text',
        placeholder: 'e.g. POL-9842109',
      },
      {
        key: 'policyType',
        label: 'Policy Type',
        type: 'select',
        options: [
          'Term Life Insurance',
          'Health / Mediclaim',
          'Whole Life Insurance',
          'Endowment / Savings Plan',
          'Motor / Vehicle Insurance',
          'Home / Property Insurance',
          'Critical Illness',
          'Other',
        ],
        placeholder: 'Select policy type',
      },
      {
        key: 'insuredPerson',
        label: 'Insured Person / Policyholder',
        type: 'text',
        placeholder: 'Name of insured individual',
      },
      {
        key: 'sumAssured',
        label: 'Sum Assured / Coverage Amount',
        type: 'text',
        placeholder: 'e.g. ₹1,00,00,000',
      },
      {
        key: 'premium',
        label: 'Premium Amount',
        type: 'text',
        placeholder: 'e.g. ₹24,000',
      },
      {
        key: 'premiumFrequency',
        label: 'Premium Frequency',
        type: 'select',
        options: ['Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'Single Premium'],
        placeholder: 'Select frequency',
      },
      {
        key: 'startDate',
        label: 'Policy Start Date',
        type: 'date',
      },
      {
        key: 'expiryDate',
        label: 'Renewal / Expiry Date',
        type: 'date',
      },
      {
        key: 'maturityDate',
        label: 'Maturity Date (if applicable)',
        type: 'date',
      },
      {
        key: 'nominee',
        label: 'Registered Nominee on Policy',
        type: 'text',
        placeholder: 'Nominee designated with insurance provider',
      },
    ],
  },

  investments: {
    categoryKey: 'investments',
    label: 'Investments',
    description: 'Mutual funds, stocks, bonds and investment portfolios',
    fields: [
      {
        key: 'institution',
        label: 'Broker / Fund House',
        type: 'text',
        placeholder: 'e.g. Zerodha, Vanguard, SBI Mutual Fund',
      },
      {
        key: 'investmentType',
        label: 'Investment Type',
        type: 'select',
        options: [
          'Mutual Fund',
          'Direct Equity / Stocks',
          'Bonds / Debentures',
          'Sovereign Gold Bond (SGB)',
          'Public Provident Fund (PPF)',
          'National Pension System (NPS)',
          'REIT / InvIT',
          'Other',
        ],
        placeholder: 'Select investment type',
      },
      {
        key: 'accountReference',
        label: 'Account / Client / Demat ID',
        type: 'text',
        placeholder: 'e.g. Demat ID or Client Code',
      },
      {
        key: 'folioNumber',
        label: 'Folio / Certificate Number',
        type: 'text',
        placeholder: 'e.g. 104829104',
      },
      {
        key: 'quantity',
        label: 'Quantity / Units Held',
        type: 'text',
        placeholder: 'e.g. 250 units, 100 shares',
      },
      {
        key: 'purchaseDate',
        label: 'Investment Date',
        type: 'date',
      },
      {
        key: 'currentValue',
        label: 'Current Portfolio Value',
        type: 'text',
        placeholder: 'e.g. ₹12,50,000',
      },
      {
        key: 'brokerPlatform',
        label: 'Trading Platform / App',
        type: 'text',
        placeholder: 'e.g. Zerodha Kite, Groww, AngelOne',
      },
    ],
  },

  digital: {
    categoryKey: 'digital',
    label: 'Digital',
    description: 'Online accounts, domains, cloud services and digital assets',
    fields: [
      {
        key: 'platform',
        label: 'Platform / Service Name',
        type: 'text',
        placeholder: 'e.g. Google Workspace, AWS, GitHub, Namecheap',
      },
      {
        key: 'accountIdentifier',
        label: 'Username / Handle / Domain',
        type: 'text',
        placeholder: 'e.g. user@domain.com, mylegacy.org',
      },
      {
        key: 'recoveryEmail',
        label: 'Associated / Recovery Email',
        type: 'text',
        placeholder: 'e.g. backup@digivirasat.com',
      },
      {
        key: 'website',
        label: 'Website / Login URL',
        type: 'text',
        placeholder: 'e.g. https://github.com',
      },
      {
        key: 'accountType',
        label: 'Account Type',
        type: 'select',
        options: [
          'Domain Name',
          'Cloud Hosting / Infrastructure',
          'Email / Productivity Account',
          'Social Media / Creator Account',
          'Subscription / Licensing',
          'Digital Vault / Storage',
          'Other',
        ],
        placeholder: 'Select account type',
      },
    ],
  },

  business: {
    categoryKey: 'business',
    label: 'Business',
    description: 'Companies, partnerships, equity and commercial holdings',
    fields: [
      {
        key: 'companyName',
        label: 'Company / Entity Name',
        type: 'text',
        placeholder: 'e.g. Virasat Labs Private Limited',
      },
      {
        key: 'registrationNumber',
        label: 'Registration / CIN / LLPIN No.',
        type: 'text',
        placeholder: 'e.g. U72900MH2023PTC123456',
      },
      {
        key: 'ownershipPercentage',
        label: 'Ownership Percentage (%)',
        type: 'text',
        placeholder: 'e.g. 45%',
      },
      {
        key: 'role',
        label: 'Designation / Role',
        type: 'text',
        placeholder: 'e.g. Founder & Director, Partner, Sole Proprietor',
      },
      {
        key: 'shareholding',
        label: 'Number of Shares / Units',
        type: 'text',
        placeholder: 'e.g. 45,000 Equity Shares',
      },
      {
        key: 'registeredAddress',
        label: 'Registered Office Address',
        type: 'text',
        placeholder: 'Full registered office address',
      },
    ],
  },

  legal: {
    categoryKey: 'legal',
    label: 'Legal',
    description: 'Wills, trusts, powers of attorney and legal records',
    fields: [
      {
        key: 'instrumentType',
        label: 'Legal Instrument',
        type: 'select',
        options: [
          'Registered Will / Testament',
          'Family Trust Deed',
          'General Power of Attorney (GPA)',
          'Special Power of Attorney (SPA)',
          'Living Will / Healthcare Directive',
          'Shareholders Agreement',
          'Partnership Deed',
          'Other',
        ],
        placeholder: 'Select legal instrument',
      },
      {
        key: 'registrationNumber',
        label: 'Registration / Reference No.',
        type: 'text',
        placeholder: 'Registration index or document identifier',
      },
      {
        key: 'issuingAuthority',
        label: 'Sub-Registrar / Court / Authority',
        type: 'text',
        placeholder: 'e.g. Sub-Registrar Office, Mumbai',
      },
      {
        key: 'effectiveDate',
        label: 'Execution / Effective Date',
        type: 'date',
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date (if term limited)',
        type: 'date',
      },
      {
        key: 'legalFirm',
        label: 'Drafting Counsel / Law Firm',
        type: 'text',
        placeholder: 'Name and contact of executing advocate',
      },
    ],
  },

  other: {
    categoryKey: 'other',
    label: 'Other Assets',
    description: 'Vehicles, valuables, heirlooms and miscellaneous legacy items',
    fields: [
      {
        key: 'itemType',
        label: 'Asset / Item Type',
        type: 'text',
        placeholder: 'e.g. Motor Vehicle, Heirloom Jewelry, Art, Safe Box',
      },
      {
        key: 'location',
        label: 'Physical Location / Custody',
        type: 'text',
        placeholder: 'e.g. Bank Locker #142 at SBI Bandra, Home Safe',
      },
      {
        key: 'ownershipDetails',
        label: 'Ownership Details / Co-owners',
        type: 'text',
        placeholder: 'e.g. Jointly owned with spouse',
      },
      {
        key: 'acquisitionDate',
        label: 'Acquisition / Heritage Date',
        type: 'date',
      },
      {
        key: 'notes',
        label: 'Preservation & Legacy Instructions',
        type: 'textarea',
        placeholder: 'Handling, storage, or legacy handover instructions',
      },
    ],
  },
};

export const getCategoryFieldConfig = (category) => {
  const key = (category || 'other').toLowerCase().trim();
  return ASSET_CATEGORY_FIELDS[key] || ASSET_CATEGORY_FIELDS.other;
};
