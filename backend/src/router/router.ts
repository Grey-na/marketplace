import { Router } from "express";
import HealthCheckController from "../app/controllers/HealthCheckController";

const router: Router = Router();

const healthCtrl = new HealthCheckController();

//Healthcheck
router.get("/healthcheck", healthCtrl.handleHealthCheck);

export default router;