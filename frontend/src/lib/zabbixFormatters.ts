/**
 * Zabbix Telemetry Unit & Value Formatter (Zabbix 7.0 standard)
 */

export interface FormattedZabbixMetric {
  value: string
  units: string
  fullDisplay: string
  isJson: boolean
  isNumeric: boolean
  jsonPreview?: string
  jsonFormatted?: string
}

export function formatZabbixValue(
  rawValue: string | number | null | undefined,
  rawUnits?: string | null
): FormattedZabbixMetric {
  if (rawValue === null || rawValue === undefined) {
    return {
      value: '--',
      units: '',
      fullDisplay: '--',
      isJson: false,
      isNumeric: false,
    }
  }

  const str = String(rawValue).trim()

  // 1. Check if JSON object or array
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const parsed = JSON.parse(str)
      const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length
      return {
        value: `JSON (${count} ${Array.isArray(parsed) ? 'items' : 'keys'})`,
        units: '',
        fullDisplay: str,
        isJson: true,
        isNumeric: false,
        jsonPreview: `JSON (${count} ${Array.isArray(parsed) ? 'items' : 'keys'})`,
        jsonFormatted: JSON.stringify(parsed, null, 2),
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  const unit = (rawUnits || '').trim()

  // 2. Check if numeric
  const num = Number(str)
  if (!isNaN(num) && str !== '') {
    // Handling Bytes (B)
    if (unit === 'B') {
      const bytes = Math.abs(num)
      const sign = num < 0 ? '-' : ''
      if (bytes >= 1024 ** 4) {
        return {
          value: `${sign}${(bytes / 1024 ** 4).toFixed(2)}`,
          units: 'TB',
          fullDisplay: `${sign}${(bytes / 1024 ** 4).toFixed(2)} TB`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bytes >= 1024 ** 3) {
        return {
          value: `${sign}${(bytes / 1024 ** 3).toFixed(2)}`,
          units: 'GB',
          fullDisplay: `${sign}${(bytes / 1024 ** 3).toFixed(2)} GB`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bytes >= 1024 ** 2) {
        return {
          value: `${sign}${(bytes / 1024 ** 2).toFixed(2)}`,
          units: 'MB',
          fullDisplay: `${sign}${(bytes / 1024 ** 2).toFixed(2)} MB`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bytes >= 1024) {
        return {
          value: `${sign}${(bytes / 1024).toFixed(2)}`,
          units: 'KB',
          fullDisplay: `${sign}${(bytes / 1024).toFixed(2)} KB`,
          isJson: false,
          isNumeric: true,
        }
      }
      return {
        value: `${num}`,
        units: 'B',
        fullDisplay: `${num} B`,
        isJson: false,
        isNumeric: true,
      }
    }

    // Handling Network Rates (Bps)
    if (unit === 'Bps') {
      const bytes = Math.abs(num)
      const sign = num < 0 ? '-' : ''
      if (bytes >= 1000 ** 3) {
        return {
          value: `${sign}${(bytes / 1000 ** 3).toFixed(2)}`,
          units: 'GBps',
          fullDisplay: `${sign}${(bytes / 1000 ** 3).toFixed(2)} GBps`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bytes >= 1000 ** 2) {
        return {
          value: `${sign}${(bytes / 1000 ** 2).toFixed(2)}`,
          units: 'MBps',
          fullDisplay: `${sign}${(bytes / 1000 ** 2).toFixed(2)} MBps`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bytes >= 1000) {
        return {
          value: `${sign}${(bytes / 1000).toFixed(2)}`,
          units: 'KBps',
          fullDisplay: `${sign}${(bytes / 1000).toFixed(2)} KBps`,
          isJson: false,
          isNumeric: true,
        }
      }
      return {
        value: `${num}`,
        units: 'Bps',
        fullDisplay: `${num} Bps`,
        isJson: false,
        isNumeric: true,
      }
    }

    // Handling bps (bits per second)
    if (unit === 'bps') {
      const bits = Math.abs(num)
      const sign = num < 0 ? '-' : ''
      if (bits >= 1000 ** 3) {
        return {
          value: `${sign}${(bits / 1000 ** 3).toFixed(2)}`,
          units: 'Gbps',
          fullDisplay: `${sign}${(bits / 1000 ** 3).toFixed(2)} Gbps`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bits >= 1000 ** 2) {
        return {
          value: `${sign}${(bits / 1000 ** 2).toFixed(2)}`,
          units: 'Mbps',
          fullDisplay: `${sign}${(bits / 1000 ** 2).toFixed(2)} Mbps`,
          isJson: false,
          isNumeric: true,
        }
      }
      if (bits >= 1000) {
        return {
          value: `${sign}${(bits / 1000).toFixed(2)}`,
          units: 'Kbps',
          fullDisplay: `${sign}${(bits / 1000).toFixed(2)} Kbps`,
          isJson: false,
          isNumeric: true,
        }
      }
      return {
        value: `${num}`,
        units: 'bps',
        fullDisplay: `${num} bps`,
        isJson: false,
        isNumeric: true,
      }
    }

    // General floating point formatting (e.g. %)
    const isFloat = num % 1 !== 0
    const formattedNum = isFloat ? num.toFixed(2) : String(num)

    return {
      value: formattedNum,
      units: unit,
      fullDisplay: unit ? `${formattedNum} ${unit}` : formattedNum,
      isJson: false,
      isNumeric: true,
    }
  }

  // 3. String / Status text
  return {
    value: str,
    units: unit,
    fullDisplay: unit ? `${str} ${unit}` : str,
    isJson: false,
    isNumeric: false,
  }
}
