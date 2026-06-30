package com.shopnow.reviewservice.repository;

import com.shopnow.reviewservice.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    Page<Review> findByProductIdAndFlaggedFalse(UUID productId, Pageable pageable);
    List<Review> findByUserId(UUID userId);
    List<Review> findByProductId(UUID productId);
}
