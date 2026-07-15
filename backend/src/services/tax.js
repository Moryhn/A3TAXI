// Quebec sales tax: drivers enter the tax-included trip total, and the
// printed invoice back-calculates the pre-tax subtotal and itemizes GST
// (TPS) + QST (TVQ) from it. QST is computed on the same pre-tax base as
// GST — not compounded on top of GST-included price — per Revenu Québec's
// rules since 2013.
const GST_RATE = 0.05;
const QST_RATE = 0.09975;

export function calculateTaxBreakdown(totalAmount) {
    const total = Number(totalAmount);
    const preTax = total / (1 + GST_RATE + QST_RATE);
    return {
        preTax,
        gst: preTax * GST_RATE,
        qst: preTax * QST_RATE,
        total,
    };
}
