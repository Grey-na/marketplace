/**
 * @description A product can be bought only if it is active, not blocked, and its shop is approved
 */
export const isBuyable = (
    product: { status: string; isBlocked: boolean },
    shop?: { status: string } | null
): boolean => {
    return product.status === "active" && !product.isBlocked && shop?.status === "approved";
}