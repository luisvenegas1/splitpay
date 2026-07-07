import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout/Layout'
import Button from '@/components/ui/Button/Button'
import Spinner from '@/components/ui/Spinner/Spinner'
import Modal from '@/components/ui/Modal/Modal'
import { useAuth } from '@/context/AuthContext'
import { upsertProfile, getBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } from '@/services/profiles'
import styles from './Profile.module.css'

const CURRENCY_LABEL = { CRC: '🇨🇷 Colones', USD: '🇺🇸 Dólares' }

function emptyAccount() {
  return { bank_name: '', currency: 'CRC', account: '', iban: '' }
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Datos básicos
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  // Cuentas bancarias
  const [accounts, setAccounts]       = useState([])
  const [acctLoading, setAcctLoading] = useState(true)

  // Modal agregar/editar cuenta
  const [acctModal, setAcctModal]   = useState(false)
  const [editingAcct, setEditingAcct] = useState(null)   // null = nueva
  const [acctForm, setAcctForm]     = useState(emptyAccount())
  const [acctSaving, setAcctSaving] = useState(false)
  const [acctError, setAcctError]   = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    getBankAccounts(user.id)
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setAcctLoading(false))
  }, [user])

  // ── Guardar datos básicos ────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setError(''); setSuccess(false); setSaving(true)
    try {
      await upsertProfile(user.id, { name: name.trim(), phone: phone.trim() || null })
      await refreshProfile()
      setSuccess(true)
    } catch (err) {
      setError(err?.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Abrir modal cuenta ───────────────────────────────────
  function openAddAccount() {
    setEditingAcct(null)
    setAcctForm(emptyAccount())
    setAcctError('')
    setAcctModal(true)
  }

  function openEditAccount(acct) {
    setEditingAcct(acct)
    setAcctForm({ bank_name: acct.bank_name, currency: acct.currency, account: acct.account ?? '', iban: acct.iban ?? '' })
    setAcctError('')
    setAcctModal(true)
  }

  async function handleSaveAccount(e) {
    e.preventDefault()
    if (!acctForm.bank_name.trim()) { setAcctError('El nombre del banco es obligatorio.'); return }
    if (!acctForm.account.trim() && !acctForm.iban.trim()) { setAcctError('Ingresá al menos el número de cuenta o el IBAN.'); return }
    setAcctError(''); setAcctSaving(true)
    try {
      const payload = {
        bank_name: acctForm.bank_name.trim(),
        currency: acctForm.currency,
        account: acctForm.account.trim() || null,
        iban: acctForm.iban.trim() || null,
      }
      if (editingAcct) {
        const updated = await updateBankAccount(editingAcct.id, payload)
        setAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a))
      } else {
        const created = await addBankAccount(user.id, payload)
        setAccounts((prev) => [...prev, created])
      }
      setAcctModal(false)
    } catch (err) {
      setAcctError(err?.message ?? 'Error al guardar la cuenta.')
    } finally {
      setAcctSaving(false)
    }
  }

  async function handleDeleteAccount(acct) {
    if (!window.confirm(`¿Eliminar la cuenta de ${acct.bank_name}?`)) return
    try {
      await deleteBankAccount(acct.id)
      setAccounts((prev) => prev.filter((a) => a.id !== acct.id))
    } catch (err) {
      alert(err?.message ?? 'Error al eliminar.')
    }
  }

  if (!profile) return <Layout><Spinner /></Layout>

  const colAccounts = accounts.filter((a) => a.currency === 'CRC')
  const usdAccounts = accounts.filter((a) => a.currency === 'USD')

  return (
    <Layout>
      <div className={`${styles.page} container`}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Atrás</button>

        <div className={styles.header}>
          <div className={styles.avatar}>{(profile.name || user?.email || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <h1 className={styles.title}>Mi perfil</h1>
            <p className={styles.subtitle}>{user?.email}</p>
          </div>
        </div>

        {/* ── Datos personales ── */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Datos personales</h2>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre completo *</label>
                <input className={styles.input} value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Teléfono / SINPE Móvil</label>
                <input className={styles.input} type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="88001234" />
              </div>
            </div>

            {error   && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>✅ Perfil actualizado correctamente.</p>}

            <div className={styles.footer}>
              <Button type="submit" loading={saving}>Guardar cambios</Button>
            </div>
          </section>
        </form>

        {/* ── Cuentas bancarias ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cuentas bancarias</h2>
            <Button size="sm" variant="secondary" onClick={openAddAccount}>+ Agregar cuenta</Button>
          </div>
          <p className={styles.sectionHint}>
            Estas cuentas aparecerán en la tarjeta de pago de tus eventos.
          </p>

          {acctLoading && <Spinner />}

          {!acctLoading && accounts.length === 0 && (
            <p className={styles.emptyAcct}>No hay cuentas registradas aún.</p>
          )}

          {!acctLoading && colAccounts.length > 0 && (
            <div className={styles.acctGroup}>
              <span className={styles.acctGroupLabel}>🇨🇷 Colones (CRC)</span>
              {colAccounts.map((a) => <AccountCard key={a.id} account={a} onEdit={openEditAccount} onDelete={handleDeleteAccount} />)}
            </div>
          )}

          {!acctLoading && usdAccounts.length > 0 && (
            <div className={styles.acctGroup}>
              <span className={styles.acctGroupLabel}>🇺🇸 Dólares (USD)</span>
              {usdAccounts.map((a) => <AccountCard key={a.id} account={a} onEdit={openEditAccount} onDelete={handleDeleteAccount} />)}
            </div>
          )}
        </section>
      </div>

      {/* Modal agregar / editar cuenta */}
      <Modal
        isOpen={acctModal}
        onClose={() => setAcctModal(false)}
        title={editingAcct ? 'Editar cuenta' : 'Agregar cuenta bancaria'}
        size="sm"
      >
        <form onSubmit={handleSaveAccount} className={styles.acctForm}>
          <div className={styles.field}>
            <label className={styles.label}>Banco *</label>
            <input className={styles.input} value={acctForm.bank_name}
              onChange={(e) => setAcctForm((f) => ({ ...f, bank_name: e.target.value }))}
              placeholder="Ej: BAC, BCR, BN, Davivienda..." required autoFocus />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Moneda *</label>
            <select className={styles.input} value={acctForm.currency}
              onChange={(e) => setAcctForm((f) => ({ ...f, currency: e.target.value }))}>
              <option value="CRC">🇨🇷 Colones (CRC)</option>
              <option value="USD">🇺🇸 Dólares (USD)</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Número de cuenta</label>
            <input className={styles.input} value={acctForm.account}
              onChange={(e) => setAcctForm((f) => ({ ...f, account: e.target.value }))}
              placeholder="Ej: 907153563" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>IBAN</label>
            <input className={styles.input} value={acctForm.iban}
              onChange={(e) => setAcctForm((f) => ({ ...f, iban: e.target.value }))}
              placeholder="Ej: CR35010200009071535631" />
          </div>

          {acctError && <p className={styles.error}>{acctError}</p>}

          <div className={styles.acctModalFooter}>
            <Button type="button" variant="ghost" onClick={() => setAcctModal(false)}>Cancelar</Button>
            <Button type="submit" loading={acctSaving}>
              {editingAcct ? 'Guardar cambios' : 'Agregar cuenta'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

function AccountCard({ account, onEdit, onDelete }) {
  return (
    <div className={styles.acctCard}>
      <div className={styles.acctCardInfo}>
        <span className={styles.acctBank}>{account.bank_name}</span>
        {account.account && (
          <span className={styles.acctDetail}>Cuenta: <strong>{account.account}</strong></span>
        )}
        {account.iban && (
          <span className={styles.acctDetail}>IBAN: <strong>{account.iban}</strong></span>
        )}
      </div>
      <div className={styles.acctCardActions}>
        <button className={styles.acctBtn} onClick={() => onEdit(account)} title="Editar">✏️</button>
        <button className={`${styles.acctBtn} ${styles.acctBtnDanger}`} onClick={() => onDelete(account)} title="Eliminar">🗑️</button>
      </div>
    </div>
  )
}
