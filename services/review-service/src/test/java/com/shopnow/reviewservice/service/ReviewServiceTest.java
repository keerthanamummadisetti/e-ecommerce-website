package com.shopnow.reviewservice.service;

import com.shopnow.reviewservice.dto.ReviewRequest;
import com.shopnow.reviewservice.model.Review;
import com.shopnow.reviewservice.repository.ReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private KafkaTemplate<String, String> kafkaTemplate;

    private ReviewService reviewService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        reviewService = new ReviewService(reviewRepository, kafkaTemplate);
    }

    @Test
    void testSubmitReview_Flagged() {
        ReviewRequest request = new ReviewRequest();
        request.setProductId(UUID.randomUUID());
        request.setUserId(UUID.randomUUID());
        request.setRating(5);
        request.setTitle("Great buy");
        request.setComment("This is not a fake product!"); // Contains 'fake' which is in our filter word list!

        Review review = new Review("rev123", request.getProductId(), request.getUserId(), 5, "Great buy", "This is not a fake product!", true);
        review.setFlagged(true);

        when(reviewRepository.save(any(Review.class))).thenReturn(review);

        Review result = reviewService.submitReview(request);

        assertNotNull(result);
        assertTrue(result.isFlagged());
        verify(reviewRepository, times(1)).save(any(Review.class));
    }

    @Test
    void testGetProductSummary() {
        UUID productId = UUID.randomUUID();
        List<Review> reviews = Arrays.asList(
                new Review("1", productId, UUID.randomUUID(), 5, "Excellent", "Love it", true),
                new Review("2", productId, UUID.randomUUID(), 4, "Good", "Satisfied", true)
        );

        when(reviewRepository.findByProductId(productId)).thenReturn(reviews);

        Map<String, Object> summary = reviewService.getProductSummary(productId);

        assertNotNull(summary);
        assertEquals(productId, summary.get("productId"));
        assertEquals(4.50, (Double) summary.get("averageRating"));
        assertEquals(2, (Integer) summary.get("totalReviews"));
    }
}
