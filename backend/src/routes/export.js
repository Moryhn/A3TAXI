import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { buildExportWorkbook } from '../services/excelExport.js';

const router = Router();

router.get('/excel', requireAuth('admin'), async (req, res) => {
    const workbook = await buildExportWorkbook();
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="a3taxi-export-${date}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
});

export default router;
