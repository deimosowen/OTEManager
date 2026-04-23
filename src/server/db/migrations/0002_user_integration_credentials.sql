CREATE TABLE `user_integration_credentials` (
	`user_login` text(256) NOT NULL,
	`provider` text(64) NOT NULL,
	`cipher_blob` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	PRIMARY KEY(`user_login`, `provider`)
);
