import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

export const getUserProfile = async(req,res) => {
    const { username } = req.params;
    try {
        const user = await User.findOne({ username }).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });

    }
};
export const getSuggestedUsers = async(req,res) => {

    try {
        const userId = req.user._id;
        const usersFollowedByMe = await User.findById(userId).select("following");
        const users = await User.aggregate([
            {
                $match: {
                    _id: { $ne: userId },
                },
            },
            { $sample: { size: 10 } },
        ]);

        const filteredUsers = users.filter((user) => !usersFollowedByMe.following.includes(user._id));
        const suggestedUsers = filteredUsers.slice(0, 4);

        suggestedUsers.forEach((user) => (user.password = null));

        res.status(200).json(suggestedUsers);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }

};
export const followUnfollowUser = async(req,res) => {
    const {id} = req.params;

    try {
        const userToModify = await User.findById(id);
        const currentUser = req.user;
        
        if(!userToModify || !currentUser) {
            return res.status(400).json({error: "User not found"});
        }
        if(id === currentUser._id.toString()) {
            return res.status(400).json({error: "You can't follow/unfollow yourself"});
        }

        const isFollowing = currentUser.following.includes(id);
        if(isFollowing) {
            // unfllow
            await User.findByIdAndUpdate(id,{$pull: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id,{$pull: {following: id}});
            res.status(200).json({message: "unfollowed successfully"})

        }
        else {
            // follow
            await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

            const newNotification = Notification.create({
                from: req.user._id,
                to: userToModify._id,
                type: "follow",
            });

            // await newNotification.save(); // can do this also 
        
            res.status(200).json({ message: "followed successfully" })

        }

    } catch (error) {
        res.status(500).json({error: "here it is in controlloer"});
        res.status(500).json({ error: "Internal Server Error" });
    }
};
export const updateUser = async(req,res) => {
    const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
    let { profileImg, coverImg } = req.body; // because will change 

    const userId = req.user._id;

    try {
        let user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        if (email) {
            const existingUserWithEmail = await User.findOne({ email });
            if (existingUserWithEmail && existingUserWithEmail._id.toString() !== user._id.toString()) {
                return res.status(400).json({ error: "Email is already in use" });
            }
            user.email = email;
        }

        if (username) {
            const existingUserWithUsername = await User.findOne({ username });
            if (existingUserWithUsername && existingUserWithUsername._id.toString() !== user._id.toString()) {
                return res.status(400).json({ error: "Username is not available" });
            }
            user.username = username;
        }
        
        if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
            return res.status(400).json({ error: "Please provide both current password and new password" });
        }

        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        if (profileImg) {
            if (user.profileImg) {
                // https://res.cloudinary.com/dyfqon1v6/image/upload/v1712997552/zmxorcxexpdbh8r0bkjb.png
                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
            }

            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;
        }

        if (coverImg) {
            if (user.coverImg) {
                await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
            }

            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadedResponse.secure_url;
        }

        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        user = await user.save();

        // password should be null in response
        user.password = null;

        return res.status(200).json(user);
    } catch (error) {
        // console.log("Error in updateUser: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

