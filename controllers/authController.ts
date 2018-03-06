import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import * as emailTemplates from 'email-templates';
import * as path from 'path';

import config from '../config/config';
import User from '../models/user.model';
import UserController from './userController';

export default class AuthController extends UserController {
    model = User;

    login = (req, res) => {
        this.getUser(req, (err, user) => {
            if (err) {
                res.status(500).json({
                    'success': false,
                    'error': 'Can\'t find user'
                });
                return console.error(err);
            }
            if (user == null) {
                res.status(400).json({
                    'success': false,
                    'error': 'Not Found User'
                });
            } else {
                console.error("AuthController -> got user: " + JSON.stringify(user));
                console.error("AuthController -> req.body.password: " + req.body.password);
                console.error("AuthController -> user.password: " + user.password);

                user.comparePassword(req.body.password, user.password, (error, isMatch) => {
                    if (error) {
                        res.status(500).json({
                            'success': false,
                            'error': 'Can\'t compare password'
                        });
                        return console.error("AuthController -> comparePassword error: " + error);
                    }
                    if (isMatch) {

                        const payload = {
                            id: user._id
                        };

                        const token = jwt.sign(payload, config.secret, {
                            expiresIn: 86400 // expires in 24 hours
                        });

                        res.json({
                            'success': true,
                            'token': token,
                            'userID': user._id,
                            'profileId': user.profile
                        });
                    } else {
                        res.status(400).json({
                            'success': false,
                            'error': 'Invalid Password'
                        });
                    }
                });
            }
        });
    }

    signup = (req, res) => {
        this.addUser(req, res);
    }

    resetPassword = (req, res) => {
        this.getUser(req, (err, user) => {
            if (err) {
                res.status(500).json({
                    'success': false,
                    'error': 'Invalid user provided.'
                });
                return console.error(err);
            }
            if (user == null) {
                res.status(400).json({
                    'success': false,
                    'error': 'Not Found User'
                });
            } else {
                const payload = {
                    id: user._id
                };

                const recovery_token = jwt.sign(payload, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });

                const transporter = nodemailer.createTransport(config.mailer);
                const mailData = {
                    from: 'no-reply@repvsrep.com <donotreply@repvsrep.com>',
                    to: user.email,
                    subject: 'Reset Password',
                    text: 'Dear ' + user.name + '!',
                    html: '<p>Please click <a href="' + config.resetLink +
                        recovery_token + '">here</a> to reset your password.</p>'
                };

                transporter.sendMail(mailData, (sendError, info) => {
                    if (sendError) {
                        return res.status(500).json({
                            success: false,
                            error: sendError.message
                        });
                    }
                    res.status(200).json({
                        success: true,
                        message: 'Reset password email has been sent to ' + user.email + '.'
                    });
                });
            }
        });
    }
}
