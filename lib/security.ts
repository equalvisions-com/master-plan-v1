import { createHmac } from 'crypto';
import { logger } from '@/lib/logger';

export function verifySignature(
  signature: string | null,
  body: unknown,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      logger.warn('Missing signature or secret');
      return false;
    }

    // Log incoming data for debugging
    logger.info('Verifying signature:', {
      receivedSignature: signature,
      bodyLength: JSON.stringify(body).length,
      secretLength: secret.length
    });

    const hmac = createHmac('sha256', secret);
    const bodyString = JSON.stringify(body);
    const computedSignature = hmac.update(bodyString).digest('hex');

    // Log computed signature for comparison
    logger.info('Signature comparison:', {
      received: signature,
      computed: computedSignature,
      match: signature === computedSignature
    });

    return signature === computedSignature;
  } catch (error) {
    logger.error('Signature verification failed:', error);
    return false;
  }
} 