-- Prevent duplicate daily goals for the same user and goal type.
CREATE UNIQUE INDEX "Goal_userId_type_date_key" ON "Goal"("userId", "type", "date");
