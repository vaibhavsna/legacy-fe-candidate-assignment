import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { verifyMessage } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const VerifyBodySchema = z.object({
  message: z.string().min(1, 'message is required'),
  signature: z.string().min(1, 'signature is required'),
});

app.post('/verify-signature', async (req, res) => {
  const parseResult = VerifyBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parseResult.error.flatten(),
    });
  }

  const { message, signature } = parseResult.data;
  try {
    const recoveredAddress = verifyMessage(message, signature);
    return res.json({
      isValid: true,
      signer: recoveredAddress,
      originalMessage: message,
    });
  } catch (error) {
    return res.status(200).json({
      isValid: false,
      signer: null,
      originalMessage: message,
      error: 'Signature verification failed',
    });
  }
});

const PORT = Number(process.env.PORT) || 4000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

export default app;
