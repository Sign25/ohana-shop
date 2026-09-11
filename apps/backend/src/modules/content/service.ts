import { MedusaService } from "@medusajs/framework/utils"
import { Banner, Page } from "./models"

class ContentModuleService extends MedusaService({ Page, Banner }) {}

export default ContentModuleService
