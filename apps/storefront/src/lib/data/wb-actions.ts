"use server"

import { getWbProduct } from "@/lib/data/wb"

/** Подгрузка следующей страницы отзывов Wildberries (клиентская вкладка «Отзывы») */
export const loadWbReviews = async (code: string, offset: number) => getWbProduct(code, offset, 10)
