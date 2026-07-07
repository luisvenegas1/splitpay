import styles from './InvoiceViewer.module.css'

export default function InvoiceViewer({ invoices = [] }) {
  if (invoices.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Factura</h3>
      <div className={styles.list}>
        {invoices.map((inv) => (
          <div key={inv.id} className={styles.item}>
            {inv.file_type === 'image' ? (
              <a href={inv.file_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={inv.file_url}
                  alt="Factura"
                  className={styles.image}
                />
                <span className={styles.viewLink}>Ver imagen completa ↗</span>
              </a>
            ) : (
              <a
                href={inv.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.pdfLink}
              >
                <span className={styles.pdfIcon}>📄</span>
                <span>Ver PDF de la factura</span>
                <span className={styles.pdfArrow}>↗</span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
