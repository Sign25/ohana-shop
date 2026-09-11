import { MedusaService } from "@medusajs/framework/utils"
import { Banner, Demand, Page } from "./models"

class ContentModuleService extends MedusaService({ Page, Banner, Demand }) {}

export default ContentModuleService
