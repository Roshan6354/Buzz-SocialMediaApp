import User  from "../models/user.model.js";
import  bcrypt  from "bcryptjs";
import generateTokenAndSetCookie from "../utils/generateToken.js";
export const signUp = async(req,res) => {
    try {
        const {fullName,username,email,password} = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
        if(!emailRegex.test(email)) {
            return res.status(400).json({error: "Invalid email format"});
        }

        const isExistingUsername = await User.findOne({username});

        if(isExistingUsername) {
            return res.status(400).json({error: "Username is already taken"});
        }
        const isExistingEmail = await User.findOne({ email });

        if (isExistingEmail) {
            return res.status(400).json({ error: "Email is already taken" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            fullName,
            username,
            email,
            password:hashedPassword,
        })
        if(newUser) {
            generateTokenAndSetCookie(newUser._id,res);
            await newUser.save();

            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                username: newUser.username,
                email: newUser.email,
                followers: newUser.followers,
                following: newUser.following,
                profileImg: newUser.profileImg,
                coverImg: newUser.coverImg,
            })
        }
        else {
            res.status(400).json({error : "Invalid user data"});
        }

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};
export const logIn = async(req,res) => {
    try {
        const {username, password} = req.body;
        const user = await User.findOne({username});
        if(user) {
            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if(isPasswordCorrect) {
                generateTokenAndSetCookie(user._id,res);
                res.status(200).json({
                    _id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    email: user.email,
                    followers: user.followers,
                    following: user.following,
                    profileImg: user.profileImg,
                    coverImg: user.coverImg,
                })
            }
            else {
                res.status(400).json({ error: "invalid password" });
            }

        }
        else {
            res.status(400).json({error: "invalid username"});
        }

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }

};
export const logOut = async(req,res) => {
    try {
        res.cookie("jwt","",{maxAge:0});
        res.status(200).json({message: "Logged out sucessfully"});
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getMe = async(req,res) => {
    try {
        // const user =  await User.findById(req.user._id);
        res.status(200).json(req.user);
    } catch (error) {
        // res.status(500).json({error: "here "});
        res.status(500).json({ error: "Internal Server Error" });
    }
};