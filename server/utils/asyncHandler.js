const asyncHandler = (controller) => {
  return (req, res, next) => {
    Promise.resolve(
      controller(req, res, next)
    ).catch(next);
  };
};

module.exports = asyncHandler;