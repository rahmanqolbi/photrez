# 11 - Implementation Handoff Template

Use this template to hand over implementation tasks to any AI coding agent.

## How to Use

1. Copy one template block below.
2. Fill all required fields.
3. Send it as the primary instruction.
4. Reject responses that skip verification evidence.

## Global Rules (Always Include)

- Follow `AGENTS.md`.
- Follow `docs/spec/product-scope.md`, `docs/spec/prd.md`, `docs/ARCHITECTURE.md`, `docs/spec/trd.md`.
- Keep changes in scope.
- Do not start unrelated refactors.
- Report blockers explicitly.

## Template A - Docs-Only Task

```md
Task Type: Docs-only

Objective:
<one clear objective>

Allowed Files:
<list exact file paths>

Out of Scope:
<what must not be changed>

Definition of Done:
1. <doc outcome 1>
2. <doc outcome 2>

Output Format:
1. Summary of changes
2. File list changed
3. Open issues or blockers
```

## Template B - Implementation Task

```md
Task Type: Implementation-approved

Objective:
<one clear implementation objective>

Scope Boundary:
- In scope: <explicit list>
- Out of scope: <explicit list>

Target Files:
<exact paths if known>

Acceptance Criteria:
1. <behavior/result 1>
2. <behavior/result 2>
3. <behavior/result 3>

Required Verification:
1. <test/build/type-check command>
2. <contract/smoke command>
3. <perf check command or note>

Definition of Done:
1. Code and tests updated
2. Relevant docs updated
3. Verification evidence reported

Output Format:
1. What changed
2. Why it changed
3. Verification results
4. Remaining risks
```

## Template C - Review/Audit Task

```md
Task Type: Review/audit

Review Scope:
<files or feature area>

Priority:
- Identify bugs, regressions, and missing tests first.

Output Format:
1. Findings by severity
2. File references
3. Suggested fixes
4. Residual risks
```

## Quick Prompt (Ready to Reuse)

```md
Follow AGENTS.md and docs scope/architecture/TRD.
Work only on the requested scope.
Do not implement out-of-scope features.
Return verification evidence and remaining blockers.
```

## Template Bahasa Indonesia (Ringkas)

### A. Docs-only

```md
Jenis Tugas: Docs-only

Tujuan:
<tujuan tunggal yang jelas>

File yang Boleh Diubah:
<daftar path file>

Di Luar Scope:
<hal yang tidak boleh diubah>

Kriteria Selesai:
1. <hasil dokumen 1>
2. <hasil dokumen 2>

Format Output:
1. Ringkasan perubahan
2. Daftar file yang diubah
3. Risiko atau blocker
```

### B. Implementation-approved

```md
Jenis Tugas: Implementation-approved

Tujuan:
<tujuan implementasi tunggal>

Batas Scope:
- In scope: <daftar jelas>
- Out of scope: <daftar jelas>

Target File:
<path file jika sudah diketahui>

Acceptance Criteria:
1. <hasil perilaku 1>
2. <hasil perilaku 2>
3. <hasil perilaku 3>

Verifikasi Wajib:
1. <perintah test/build/type-check>
2. <perintah contract/smoke>
3. <cek performa atau catatan jika belum bisa>

Definisi Selesai:
1. Kode dan test terupdate
2. Dokumen relevan terupdate
3. Bukti verifikasi dilaporkan

Format Output:
1. Perubahan apa
2. Alasan perubahan
3. Hasil verifikasi
4. Risiko tersisa
```

### C. Review/audit

```md
Jenis Tugas: Review/audit

Scope Review:
<fitur atau file yang direview>

Prioritas:
- Temukan bug, regresi, dan kekurangan test terlebih dulu.

Format Output:
1. Temuan berdasarkan severity
2. Referensi file
3. Saran perbaikan
4. Risiko residual
```
