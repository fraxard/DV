const defaultOrigins = [
  'https://digivirasat.in',
  'https://www.digivirasat.in',
  'https://digitalvirasat.in',
  'https://www.digitalvirasat.in',
];

const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const parseOrigins = (val) => {
  if (!val) return [];
  return val.split(',').map((o) => o.trim()).filter(Boolean);
};

const envOrigins = [
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.APP_URL),
  ...parseOrigins(process.env.ALLOWED_ORIGINS),
];

const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...envOrigins,
  ...(process.env.NODE_ENV !== 'production' ? devOrigins : []),
]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,       // Required for cookies to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  maxAge: 86400,           // Cache preflight response for 24h
};

module.exports = corsOptions;
