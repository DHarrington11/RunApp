from server import app, db, User, bcrypt

def reset_user_password():
    """
    Manually resets a user's password in the database.
    Useful for development since we don't have an email server set up yet.
    """
    print("\n--- MANUAL PASSWORD RESET TOOL ---")
    email = input("Enter the user's email: ").strip()

    # We need the app context to access the database
    with app.app_context():
        user = User.query.filter_by(email=email).first()

        if not user:
            print(f"\n❌ Error: No user found with email '{email}'")
            return

        new_pass = input(f"Enter new password for {email}: ").strip()
        
        if not new_pass:
            print("\n❌ Error: Password cannot be empty.")
            return

        # 1. Hash the new password (CRITICAL: Never save plain text)
        hashed_password = bcrypt.generate_password_hash(new_pass).decode('utf-8')

        # 2. Update the user record
        user.password = hashed_password
        
        # 3. Save changes
        db.session.commit()

        print(f"\n✅ Success! Password for {email} has been updated.")

if __name__ == "__main__":
    reset_user_password()