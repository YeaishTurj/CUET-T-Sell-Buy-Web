-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 18, 2025 at 03:06 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `project`
--

-- --------------------------------------------------------

--
-- Table structure for table `Bid`
--

CREATE TABLE `Bid` (
  `bid_id` int(11) NOT NULL,
  `bid_price` decimal(10,2) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `op_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bid_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Bid`
--

INSERT INTO `Bid` (`bid_id`, `bid_price`, `buyer_id`, `op_id`, `user_id`, `bid_date`) VALUES
(16, 9000.00, 22, 9, 22, '2025-01-12 13:53:02'),
(17, 15000.00, 23, 9, 23, '2025-01-12 13:59:29'),
(18, 3000.00, 23, 7, 23, '2025-01-12 14:00:00'),
(19, 4000.00, 23, 7, 23, '2025-01-12 14:19:46'),
(20, 5000.00, 23, 7, 23, '2025-01-17 13:36:27');

-- --------------------------------------------------------

--
-- Table structure for table `Buyer`
--

CREATE TABLE `Buyer` (
  `buyer_name` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Buyer`
--

INSERT INTO `Buyer` (`buyer_name`, `user_id`) VALUES
('c', 22),
('d', 23),
('nazim', 24);

-- --------------------------------------------------------

--
-- Table structure for table `Cart`
--

CREATE TABLE `Cart` (
  `cart_item_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `New_Product`
--

CREATE TABLE `New_Product` (
  `p_id` int(11) NOT NULL,
  `p_title` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `desc` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `New_Product`
--

INSERT INTO `New_Product` (`p_id`, `p_title`, `price`, `quantity`, `desc`, `image`, `user_id`, `created_at`) VALUES
(6, 'Cool Graphic T-Shirt', 450.00, 50, 'A stylish graphic tee made with high-quality cotton. Perfect for casual wear!', '/uploads/1736684986637.png', 21, '2025-01-12 12:29:46'),
(7, 'Premium Cotton T-Shirt', 1500.00, 100, 'A premium cotton t-shirt with a modern fit and breathable fabric, ideal for casual everyday wear', '/uploads/1736685075147.png', 21, '2025-01-12 12:31:15'),
(8, 'Eco-Friendly Organic Cotton T-Shirt', 850.00, 75, 'An eco-friendly t-shirt made from 100% organic cotton, perfect for environmentally-conscious fashion lovers', '/uploads/1736685129028.png', 21, '2025-01-12 12:32:09');

-- --------------------------------------------------------

--
-- Table structure for table `Old_Product`
--

CREATE TABLE `Old_Product` (
  `op_id` int(11) NOT NULL,
  `op_title` varchar(255) NOT NULL,
  `asking_price` decimal(10,2) NOT NULL,
  `avail_dur` int(11) NOT NULL,
  `op_desc` text NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `canOrder` int(11) DEFAULT NULL,
  `selling_price` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Old_Product`
--

INSERT INTO `Old_Product` (`op_id`, `op_title`, `asking_price`, `avail_dur`, `op_desc`, `image`, `user_id`, `created_at`, `canOrder`, `selling_price`) VALUES
(6, 'Old-School Camera', 4000.00, 15000, 'A manual film camera for photography enthusiasts who appreciate analog photography.', '/uploads/1736685374566.png', 21, '2025-01-12 12:36:14', NULL, NULL),
(7, 'Classic Wristwatch', 3500.00, 15000, 'A timeless wristwatch with a leather strap and minimalistic design, dating back to the early 2000s.', '/uploads/1736685441457.png', 21, '2025-01-12 12:37:21', NULL, NULL),
(8, 'Antique Wooden Chair', 7000.00, 15000, 'A handcrafted, antique wooden chair perfect for collectors and vintage furniture lovers.', '/uploads/1736685528916.png', 21, '2025-01-12 12:38:48', NULL, NULL),
(9, 'Classic Bicycle', 8000.00, 1, 'A vintage bicycle from the 80s, ideal for enthusiasts of retro cycling.', '/uploads/1736685601904.png', 21, '2025-01-12 12:40:01', 23, 15000.00);

-- --------------------------------------------------------

--
-- Table structure for table `Order`
--

CREATE TABLE `Order` (
  `o_id` int(11) NOT NULL,
  `o_date` date NOT NULL,
  `np_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `op_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Order`
--

INSERT INTO `Order` (`o_id`, `o_date`, `np_id`, `user_id`, `op_id`) VALUES
(16, '2025-01-18', NULL, 23, 9);

-- --------------------------------------------------------

--
-- Table structure for table `Seller`
--

CREATE TABLE `Seller` (
  `seller_id` int(11) NOT NULL,
  `stup_name` varchar(255) DEFAULT NULL,
  `wp_no` varchar(20) DEFAULT NULL,
  `fb_link` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Seller`
--

INSERT INTO `Seller` (`seller_id`, `stup_name`, `wp_no`, `fb_link`, `user_id`) VALUES
(12, 'CUET T-Sell & Buy', '01537151215', 'http://www.facebook.com', 21);

-- --------------------------------------------------------

--
-- Table structure for table `User`
--

CREATE TABLE `User` (
  `user_id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `User`
--

INSERT INTO `User` (`user_id`, `email`, `password`, `phone`) VALUES
(21, 'u2104022@student.cuet.ac.bd', '$2b$10$MLIb2oHLPECMFgUxA2oE..TpFcZ2KRLzoKamkKC8cfEH5XDDZytQu', '01537151215'),
(22, 'u2104023@student.cuet.ac.bd', '$2b$10$9iZxMDYCKHjApeH.uG3F1.Lu.m5UTZyfvHRmwifh0DWYN8O9hWdwq', '0111111111112'),
(23, 'u2104025@student.cuet.ac.bd', '$2b$10$hFFkSWWmUrIByqcH.F6CJu2ObKnwfwg38Yiqg5QxZqu1BGFuiIXFm', '01111111111113'),
(24, 'u2104024@student.cuet.ac.bd', '$2b$10$soprYV45yPdhAE7L1AClSudoQY6NZlApBXO9dfwYGB7jtfPaKc37O', '01111111111112');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Bid`
--
ALTER TABLE `Bid`
  ADD PRIMARY KEY (`bid_id`),
  ADD KEY `buyer_id` (`buyer_id`),
  ADD KEY `op_id` (`op_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `Buyer`
--
ALTER TABLE `Buyer`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `Cart`
--
ALTER TABLE `Cart`
  ADD PRIMARY KEY (`cart_item_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `New_Product`
--
ALTER TABLE `New_Product`
  ADD PRIMARY KEY (`p_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `Old_Product`
--
ALTER TABLE `Old_Product`
  ADD PRIMARY KEY (`op_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `Order`
--
ALTER TABLE `Order`
  ADD PRIMARY KEY (`o_id`),
  ADD KEY `p_id` (`np_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `Seller`
--
ALTER TABLE `Seller`
  ADD PRIMARY KEY (`seller_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Bid`
--
ALTER TABLE `Bid`
  MODIFY `bid_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `New_Product`
--
ALTER TABLE `New_Product`
  MODIFY `p_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `Old_Product`
--
ALTER TABLE `Old_Product`
  MODIFY `op_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `Order`
--
ALTER TABLE `Order`
  MODIFY `o_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `Seller`
--
ALTER TABLE `Seller`
  MODIFY `seller_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `User`
--
ALTER TABLE `User`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Bid`
--
ALTER TABLE `Bid`
  ADD CONSTRAINT `fk_bid_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `User` (`user_id`),
  ADD CONSTRAINT `fk_bid_op` FOREIGN KEY (`op_id`) REFERENCES `Old_Product` (`op_id`),
  ADD CONSTRAINT `fk_bid_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Constraints for table `Buyer`
--
ALTER TABLE `Buyer`
  ADD CONSTRAINT `fk_buyer_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Constraints for table `Cart`
--
ALTER TABLE `Cart`
  ADD CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Constraints for table `New_Product`
--
ALTER TABLE `New_Product`
  ADD CONSTRAINT `fk_New_Product_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Constraints for table `Old_Product`
--
ALTER TABLE `Old_Product`
  ADD CONSTRAINT `fk_Old_Product_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Constraints for table `Order`
--
ALTER TABLE `Order`
  ADD CONSTRAINT `fk_order_product` FOREIGN KEY (`np_id`) REFERENCES `New_Product` (`p_id`),
  ADD CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Constraints for table `Seller`
--
ALTER TABLE `Seller`
  ADD CONSTRAINT `fk_seller_user` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
