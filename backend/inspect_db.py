from server import app, db, User

def view_users():
    """
    Connects to the site.db database and prints all registered users.
    """
    try:
        # We must use the app context to access the database defined in server.py
        with app.app_context():
            users = User.query.all()
            
            print(f"\n--- DATABASE REPORT: {len(users)} Users Found ---")
            print("-" * 60)
            print(f"{'ID':<5} | {'Email':<30} | {'Password Hash (Truncated)'}")
            print("-" * 60)
            
            for user in users:
                # We truncate the hash because it's very long
                print(f"{user.id:<5} | {user.email:<30} | {user.password[:20]}...")
            
            print("-" * 60)
            print("Note: Passwords are hashed (scrambled) for security.\n")

    except Exception as e:
        print(f"Error reading database: {e}")
        print("Make sure you are running this from the 'backend/' folder.")

if __name__ == "__main__":
    view_users()