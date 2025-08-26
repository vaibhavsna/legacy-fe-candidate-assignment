import request from 'supertest';
import app from '../src/index';
import { Wallet } from 'ethers';

describe('POST /verify-signature', () => {
  it('verifies a valid signature', async () => {
    const wallet = Wallet.createRandom();
    const message = 'hello world';
    const signature = await wallet.signMessage(message);

    const res = await request(app)
      .post('/verify-signature')
      .send({ message, signature })
      .expect(200);

    expect(res.body.isValid).toBe(true);
    expect((res.body.signer as string).toLowerCase()).toBe(
      wallet.address.toLowerCase()
    );
    expect(res.body.originalMessage).toBe(message);
  });

  it('recovers signer even if signature is for a different message', async () => {
    const wallet = Wallet.createRandom();
    const message = 'test message';
    const signature = await wallet.signMessage('different');

    const res = await request(app)
      .post('/verify-signature')
      .send({ message, signature })
      .expect(200);

    expect(res.body.isValid).toBe(true);
    expect(typeof res.body.signer).toBe('string');
    expect(res.body.originalMessage).toBe(message);
  });

  it('validates body and returns 400 for bad input', async () => {
    const res = await request(app)
      .post('/verify-signature')
      .send({})
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});


