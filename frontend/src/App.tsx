import { useEffect, useMemo, useState } from 'react'
import { BrowserProvider, HDNodeWallet } from 'ethers'
import './App.css'

type VerifyResponse = {
  isValid: boolean
  signer: string | null
  originalMessage: string
  error?: string
}

type HistoryItem = {
  id: string
  message: string
  signature: string
  result?: VerifyResponse
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

function App() {
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [testWallet, setTestWallet] = useState<HDNodeWallet | null>(null)
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const raw = localStorage.getItem('history')
    return raw ? (JSON.parse(raw) as HistoryItem[]) : []
  })

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history))
  }, [history])

  const canSign = useMemo(() => !!address && (!!provider || !!testWallet) && message.length > 0, [address, provider, testWallet, message])

  async function connectWallet() {
    const eth = (window as any).ethereum
    if (!eth) {
      alert('No wallet found. Please install MetaMask.')
      return
    }
    await eth.request({ method: 'eth_requestAccounts' })
    const browserProvider = new BrowserProvider(eth)
    setProvider(browserProvider)
    const signer = await browserProvider.getSigner()
    const addr = await signer.getAddress()
    setAddress(addr)
    setTestWallet(null)
  }

  async function signMessage() {
    if (!canSign) return
    let sig: string
    if (testWallet) {
      sig = await testWallet.signMessage(message)
    } else if (provider) {
      const signer = await provider.getSigner()
      sig = await signer.signMessage(message)
    } else {
      return
    }
    setSignature(sig)
    const item: HistoryItem = {
      id: crypto.randomUUID(),
      message,
      signature: sig,
    }
    setHistory([item, ...history])
  }

  function useTestSigner() {
    const wallet = HDNodeWallet.createRandom()
    setTestWallet(wallet)
    setProvider(null)
    setAddress(wallet.address)
  }

  async function verifySignature(sig?: string) {
    const activeSig = sig ?? signature
    if (!activeSig || !message) return
    setVerifying(true)
    try {
      const res = await fetch(`${BACKEND_URL}/verify-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature: activeSig }),
      })
      const data = (await res.json()) as VerifyResponse
      setHistory((prev) =>
        prev.map((h) => (h.signature === activeSig ? { ...h, result: data } : h)),
      )
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="container">
      <h1>Web3 Message Signer & Verifier</h1>
      <div className="card">
        <div className="row">
          <button onClick={connectWallet}>{address && !testWallet ? 'Connected' : 'Connect Wallet'}</button>
          <span className="muted">{address ?? 'Not connected'}</span>
        </div>
        <div className="row">
          <button onClick={useTestSigner}>Use test signer</button>
          {testWallet && <span className="muted">Ephemeral wallet active</span>}
        </div>
        <label>
          Message
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message to sign"
          />
        </label>
        <div className="row">
          <button disabled={!canSign} onClick={signMessage}>Sign message</button>
          <button disabled={!signature} onClick={() => verifySignature()}>Verify</button>
        </div>
      </div>

      <h2>History</h2>
      <ul className="history">
        {history.map((h) => (
          <li key={h.id} className="history-item">
            <div>
              <div className="message">{h.message}</div>
              <div className="signature">{h.signature.slice(0, 18)}…</div>
            </div>
            <div className="actions">
              <button onClick={() => (setMessage(h.message), setSignature(h.signature))}>
                Load
              </button>
              <button onClick={() => verifySignature(h.signature)} disabled={verifying}>
                Verify
              </button>
            </div>
            {h.result && (
              <div className={h.result.isValid ? 'valid' : 'invalid'}>
                {h.result.isValid ? 'Valid' : 'Invalid'} — signer: {h.result.signer ?? 'n/a'}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
