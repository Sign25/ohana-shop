"use server"

import { sdk } from "@/lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

/**
 * Полное дерево категорий без списков товаров — для шапки, меню «Каталог»,
 * боковой навигации и футера. Списки товаров в категориях (*products) стартер тянул
 * зря: на 700 товарах это десятки килобайт на каждый рендер.
 */
export const listCategoryTree = async (): Promise<
  HttpTypes.StoreProductCategory[]
> => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "id,name,handle,rank,parent_category_id,metadata,*category_children,*parent_category",
          limit: 200,
          include_descendants_tree: false,
        },
        next,
      }
    )
    .then(({ product_categories }) =>
      [...product_categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    )
}

export const listCategories = async (
  query?: Record<string, any>
): Promise<HttpTypes.StoreProductCategory[]> => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 200

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "id,name,handle,rank,parent_category_id,metadata,description,*category_children,*parent_category,*parent_category.parent_category",
          limit,
          ...query,
        },
        next,
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (
  categoryHandle: string[]
): Promise<HttpTypes.StoreProductCategory> => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "id,name,handle,description,metadata,parent_category_id,*category_children",
          handle,
        },
        next,
      }
    )
    .then(({ product_categories }) => product_categories[0])
}

/** Верхние разделы каталога (без сезонных подборок) и подборки отдельно. */
export const splitTopCategories = async (
  categories: HttpTypes.StoreProductCategory[]
) => {
  const top = categories.filter((c) => !c.parent_category_id)
  const isShowcase = (c: HttpTypes.StoreProductCategory) =>
    (c.metadata as any)?.kind === "showcase"
  return {
    catalog: top.filter((c) => !isShowcase(c)),
    showcases: top.filter(isShowcase),
  }
}
