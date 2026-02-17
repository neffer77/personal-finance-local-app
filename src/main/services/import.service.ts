import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { getDatabase } from '../database/connection'
import { getParserByIssuer, detectParser } from '../parsers/parser.registry'
import { applyRules } from './rule.service'
import { insertTransaction } from './transaction.service'
import { recomputeSnapshotsForCard } from './snapshot.service'
import { getCard } from './card.service'
import type { ImportResult, ImportRowError } from '../../shared/types'

export function importCSV(filePath: string, cardId: number): ImportResult {
  const card = getCard(cardId)
  if (!card) throw new Error(`Card not found: ${cardId}`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8')
  const filename = path.basename(filePath)
  const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex')

  const db = getDatabase()

  // Select parser based on card issuer, or auto-detect
  let parser
  try {
    parser = getParserByIssuer(card.issuer)
  } catch {
    // Try auto-detection from headers
    const firstLine = csvContent.split('\n')[0] ?? ''
    const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const detected = detectParser(headers)
    if (!detected) {
      throw new Error(`No parser found for issuer "${card.issuer}" and CSV format could not be auto-detected.`)
    }
    parser = detected
  }

  // Parse CSV rows
  const parsedRows = parser.parse(csvContent)

  // Create import record
  const importRecord = db.prepare(`
    INSERT INTO imports (card_id, filename, file_hash, row_count)
    VALUES (?, ?, ?, ?)
  `).run(cardId, filename, fileHash, parsedRows.length)

  const importId = importRecord.lastInsertRowid as number

  let importedCount = 0
  let skippedCount = 0
  const errors: ImportRowError[] = []

  // Track duplicates within this CSV for dedup hash generation
  const sigCounts = new Map<string, number>()

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i]

    try {
      // Apply smart rules
      const { categoryId, displayName } = applyRules(row.description)

      // Generate dedup hash
      const baseSig = `${cardId}${row.transactionDate}${row.description}${row.amountCents}${row.type}`
      const sigCount = (sigCounts.get(baseSig) ?? 0) + 1
      sigCounts.set(baseSig, sigCount)

      // Append sequence counter only for duplicates (count > 1)
      const hashInput = sigCount > 1 ? `${baseSig}:${sigCount}` : baseSig
      const dedupHash = crypto.createHash('sha256').update(hashInput).digest('hex')

      const result = insertTransaction({
        cardId,
        importId,
        transactionDate: row.transactionDate,
        postedDate: row.postedDate,
        description: row.description,
        originalCategory: row.originalCategory,
        type: row.type,
        amountCents: row.amountCents,
        memo: row.memo || null,
        displayName: displayName,
        categoryId: categoryId,
        notes: null,
        isReturn: row.isReturn,
        dedupHash,
      })

      if (result.inserted) {
        importedCount++
      } else {
        skippedCount++
      }
    } catch (err) {
      errors.push({
        row: i + 2, // +2 for 1-indexing + header row
        reason: err instanceof Error ? err.message : String(err),
        rawData: `${row.transactionDate} | ${row.description} | ${row.amountCents}`,
      })
    }
  }

  // Update import record with final counts
  db.prepare(`
    UPDATE imports SET imported_count = ?, skipped_count = ? WHERE id = ?
  `).run(importedCount, skippedCount, importId)

  // Recompute monthly snapshots for this card
  recomputeSnapshotsForCard(cardId)

  return {
    success: errors.length < parsedRows.length, // success if at least some rows imported
    importId,
    filename,
    rowCount: parsedRows.length,
    importedCount,
    skippedCount,
    errorCount: errors.length,
    errors,
  }
}

export function listImports() {
  const db = getDatabase()
  return db.prepare(`
    SELECT i.*, c.name as card_name
    FROM imports i
    JOIN cards c ON i.card_id = c.id
    ORDER BY i.imported_at DESC
  `).all()
}
