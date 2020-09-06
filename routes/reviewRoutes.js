const express = require('express');

const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// Preserve the req.params values from the parent router. If the parent and the child have conflicting param names, the child’s value take precedence.
const router = express.Router({ mergeParams: true });

// ********** APPLY authController.protect to ALL ROUTES after this line below **********
router.use(authController.protect);

router
  // either "api/reviews/" or "api/tour/:tourId/reviews"
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );
module.exports = router;
