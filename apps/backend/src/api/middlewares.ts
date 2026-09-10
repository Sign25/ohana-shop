import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { defineMiddlewares } from "@medusajs/medusa";
import { adminMiddlewares } from "./admin/middlewares";
import { storeMiddlewares } from "./store/middlewares";
import { ohanaMinOrder } from "./middlewares/ohana-min-order";

export default defineMiddlewares({
  routes: [
    ...adminMiddlewares,
    ...storeMiddlewares,
    {
      // обмен с 1С: файлы приходят сырым потоком, парсер тела отключён
      matcher: "/commerceml",
      bodyParser: false,
    },
    {
      // минимальный оптовый заказ 35 000 ₽ (см. lib/ohana.ts)
      matcher: "/store/carts/:id/complete",
      method: ["POST"],
      middlewares: [ohanaMinOrder],
    },
    {
      matcher: "/store/customers/me",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          req.allowed = ["employee"];
          next();
        },
      ],
    },
  ],
});
