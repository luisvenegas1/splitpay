import { useState, useCallback } from 'react'
import styles from './Calculator.module.css'

export default function Calculator() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev]       = useState(null)
  const [op, setOp]           = useState(null)
  const [waitNext, setWaitNext] = useState(false)

  const handleNumber = useCallback((n) => {
    if (waitNext) {
      setDisplay(String(n))
      setWaitNext(false)
    } else {
      setDisplay((d) => (d === '0' ? String(n) : d + n))
    }
  }, [waitNext])

  const handleDecimal = useCallback(() => {
    if (waitNext) { setDisplay('0.'); setWaitNext(false); return }
    if (!display.includes('.')) setDisplay((d) => d + '.')
  }, [display, waitNext])

  const handleOp = useCallback((nextOp) => {
    const current = parseFloat(display)
    if (prev !== null && !waitNext) {
      const result = calculate(prev, current, op)
      setDisplay(String(result))
      setPrev(result)
    } else {
      setPrev(current)
    }
    setWaitNext(true)
    setOp(nextOp)
  }, [display, prev, op, waitNext])

  const handleEqual = useCallback(() => {
    if (op === null || prev === null) return
    const current = parseFloat(display)
    const result  = calculate(prev, current, op)
    setDisplay(String(result))
    setPrev(null)
    setOp(null)
    setWaitNext(true)
  }, [display, prev, op])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setPrev(null)
    setOp(null)
    setWaitNext(false)
  }, [])

  const handleToggleSign = useCallback(() => {
    setDisplay((d) => String(parseFloat(d) * -1))
  }, [])

  const handlePercent = useCallback(() => {
    setDisplay((d) => String(parseFloat(d) / 100))
  }, [])

  function calculate(a, b, operator) {
    switch (operator) {
      case '+': return round(a + b)
      case '-': return round(a - b)
      case '×': return round(a * b)
      case '÷': return b !== 0 ? round(a / b) : 'Error'
      default:  return b
    }
  }

  function round(n) {
    return Math.round(n * 1e10) / 1e10
  }

  // Formatear display con separadores de miles
  const formattedDisplay = (() => {
    if (display === 'Error') return 'Error'
    const [int, dec] = display.split('.')
    const formatted = parseInt(int, 10).toLocaleString('es-CR')
    return dec !== undefined ? `${formatted}.${dec}` : formatted
  })()

  return (
    <div className={styles.calc}>
      <div className={styles.header}>
        <span className={styles.title}>Calculadora</span>
        {op && <span className={styles.opIndicator}>{op}</span>}
      </div>

      <div className={styles.display}>
        <span className={styles.displayValue}>{formattedDisplay}</span>
      </div>

      <div className={styles.grid}>
        {/* Fila 1 */}
        <button className={`${styles.btn} ${styles.gray}`} onClick={handleClear}>C</button>
        <button className={`${styles.btn} ${styles.gray}`} onClick={handleToggleSign}>+/-</button>
        <button className={`${styles.btn} ${styles.gray}`} onClick={handlePercent}>%</button>
        <button className={`${styles.btn} ${styles.op}`}   onClick={() => handleOp('÷')}>÷</button>

        {/* Fila 2 */}
        <button className={styles.btn} onClick={() => handleNumber('7')}>7</button>
        <button className={styles.btn} onClick={() => handleNumber('8')}>8</button>
        <button className={styles.btn} onClick={() => handleNumber('9')}>9</button>
        <button className={`${styles.btn} ${styles.op}`}   onClick={() => handleOp('×')}>×</button>

        {/* Fila 3 */}
        <button className={styles.btn} onClick={() => handleNumber('4')}>4</button>
        <button className={styles.btn} onClick={() => handleNumber('5')}>5</button>
        <button className={styles.btn} onClick={() => handleNumber('6')}>6</button>
        <button className={`${styles.btn} ${styles.op}`}   onClick={() => handleOp('-')}>−</button>

        {/* Fila 4 */}
        <button className={styles.btn} onClick={() => handleNumber('1')}>1</button>
        <button className={styles.btn} onClick={() => handleNumber('2')}>2</button>
        <button className={styles.btn} onClick={() => handleNumber('3')}>3</button>
        <button className={`${styles.btn} ${styles.op}`}   onClick={() => handleOp('+')}>+</button>

        {/* Fila 5 */}
        <button className={`${styles.btn} ${styles.zero}`} onClick={() => handleNumber('0')}>0</button>
        <button className={styles.btn}                      onClick={handleDecimal}>,</button>
        <button className={`${styles.btn} ${styles.eq}`}   onClick={handleEqual}>=</button>
      </div>
    </div>
  )
}
