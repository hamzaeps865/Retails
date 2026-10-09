CREATE TABLE `attribute_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`name` text NOT NULL,
	`input_type` text DEFAULT 'text' NOT NULL,
	`options` text,
	`is_variant_axis` integer DEFAULT true NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`name` text NOT NULL,
	`parent_id` integer,
	`profile` text DEFAULT 'custom' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category_attributes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`category_id` integer NOT NULL,
	`attribute_id` integer NOT NULL,
	`is_required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`product_id` integer NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`cost_price` integer NOT NULL,
	`sale_price` integer NOT NULL,
	`reorder_level` integer DEFAULT 0 NOT NULL,
	`is_tester` integer DEFAULT false NOT NULL,
	`custom_fields` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`name` text NOT NULL,
	`brand_id` integer,
	`category_id` integer NOT NULL,
	`gender` text DEFAULT 'unisex' NOT NULL,
	`description` text,
	`has_expiry` integer DEFAULT false NOT NULL,
	`return_rule` text DEFAULT 'allowed' NOT NULL,
	`image_path` text,
	`custom_fields` text,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `variant_attribute_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`variant_id` integer NOT NULL,
	`attribute_id` integer NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attribute_id`) REFERENCES `attribute_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`old_value` text,
	`new_value` text,
	`at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`name` text NOT NULL,
	`permissions` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`pin_hash` text,
	`role_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`variant_id` integer NOT NULL,
	`batch_no` text NOT NULL,
	`expiry_date` text,
	`quantity_remaining` integer DEFAULT 0 NOT NULL,
	`purchase_item_id` integer,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`variant_id` integer NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`variant_id` integer NOT NULL,
	`batch_id` integer,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost` integer,
	`ref_type` text,
	`ref_id` integer,
	`note` text,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`credit_limit` integer DEFAULT 0 NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`custom_fields` text
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`sale_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`batch_id` integer,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`unit_cost` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`line_total` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`sale_id` integer NOT NULL,
	`method` text NOT NULL,
	`amount` integer NOT NULL,
	`reference` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`branch_id` integer DEFAULT 1 NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_by` integer,
	`invoice_no` text NOT NULL,
	`customer_id` integer,
	`cashier_id` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`paid` integer NOT NULL,
	`change` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`voided_by` integer,
	`void_reason` text,
	`custom_fields` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attribute_definitions_uuid_unique` ON `attribute_definitions` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `brands_uuid_unique` ON `brands` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_unique` ON `brands` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_uuid_unique` ON `categories` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_attributes_uuid_unique` ON `category_attributes` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_uuid_unique` ON `product_variants` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_barcode_unique` ON `product_variants` (`barcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_uuid_unique` ON `products` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_attribute_values_uuid_unique` ON `variant_attribute_values` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `roles_uuid_unique` ON `roles` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_uuid_unique` ON `users` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `batches_uuid_unique` ON `batches` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `stock_levels_uuid_unique` ON `stock_levels` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `stock_levels_variant_id_unique` ON `stock_levels` (`variant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stock_movements_uuid_unique` ON `stock_movements` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_uuid_unique` ON `customers` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `sale_items_uuid_unique` ON `sale_items` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `sale_payments_uuid_unique` ON `sale_payments` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_uuid_unique` ON `sales` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_no_unique` ON `sales` (`invoice_no`);