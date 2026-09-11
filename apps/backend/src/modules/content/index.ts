import { Module } from "@medusajs/framework/utils"
import ContentModuleService from "./service"

/** Контент витрины: служебные страницы и баннеры (редактируются в админке) */
export const CONTENT_MODULE = "content"

export default Module(CONTENT_MODULE, { service: ContentModuleService })
