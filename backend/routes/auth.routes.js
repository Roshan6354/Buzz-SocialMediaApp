import  express  from "express";
import { signUp,logIn,logOut, getMe } from "../controllers/auth.controller.js";
import {protectRoute} from "../middleware/protectRoute.js";
const router = express.Router();


router.get("/me",protectRoute,getMe);
router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/logout", logOut);

export default router;