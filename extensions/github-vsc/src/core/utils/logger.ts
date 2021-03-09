import pino from 'pino';

const logger = pino({ level: IS_DEV ? 'debug' : 'info' });

export default logger;
