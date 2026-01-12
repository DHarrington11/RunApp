from server import app, db, User, RunPlan
import json

def view_db():
    """
    Prints all Users and their associated RunPlans.
    """
    try:
        with app.app_context():
            users = User.query.all()
            plans = RunPlan.query.all()

            print(f"\n=== DATABASE REPORT ===")
            print(f"Users Found: {len(users)}")
            print(f"Plans Found: {len(plans)}")
            print("=" * 60)

            if not users:
                print("No users found.")
            
            for user in users:
                print(f"ID: {user.id} | Email: {user.email}")
                
                # Find plans for this user
                user_plans = [p for p in plans if p.user_id == user.id]
                
                if user_plans:
                    print(f"  └── Saved Plans ({len(user_plans)}):")
                    for plan in user_plans:
                        # Parse the JSON string back to an object for display
                        data = json.loads(plan.plan_data)
                        # Assumes the plan has a 'week_1' or similar structure, or just print a snippet
                        preview = str(data)[:100].replace('\n', ' ') 
                        print(f"      - Plan ID: {plan.id} | Date: {plan.date_created} | Content: {preview}...")
                else:
                    print("  └── No plans saved.")
                
                print("-" * 60)

    except Exception as e:
        print(f"Error reading database: {e}")

if __name__ == "__main__":
    view_db()