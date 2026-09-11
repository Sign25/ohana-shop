import { MedusaService } from "@medusajs/framework/utils"
import { Banner, Demand, Page, WbRating, WbReview } from "./models"

class ContentModuleService extends MedusaService({ Page, Banner, Demand, WbRating, WbReview }) {}

export default ContentModuleService
