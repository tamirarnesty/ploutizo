import { useState, useEffect, useRef } from 'react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group'

interface FormattedAmountInputProps {
  value: number | undefined
  onChange: (v: number | undefined) => void
  onBlur: () => void
  id?: string
}

const format = (n: number) =>
  new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

export const FormattedAmountInput = ({
  value,
  onChange,
  onBlur,
  id = 'tx-amount',
}: FormattedAmountInputProps) => {
  const focused = useRef(false)
  const [displayValue, setDisplayValue] = useState(
    value !== undefined ? format(value) : '',
  )

  useEffect(() => {
    if (!focused.current) {
      setDisplayValue(value !== undefined ? format(value) : '')
    }
  }, [value])

  return (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '')
          setDisplayValue(raw)
          onChange(raw === '' ? undefined : parseFloat(raw))
        }}
        onFocus={() => {
          focused.current = true
          setDisplayValue(value !== undefined ? value.toString() : '')
        }}
        onBlur={() => {
          focused.current = false
          onBlur()
          if (value !== undefined) {
            setDisplayValue(format(value))
          }
        }}
      />
    </InputGroup>
  )
}
