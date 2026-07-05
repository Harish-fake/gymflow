import { z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.validated = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };
}

export const schemas = {
  updateProfile: z.object({
    body: z.object({
      full_name: z.string().min(2).optional(),
      phone: z.string().optional(),
      avatar_url: z.string().url().optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      dob: z.string().optional(),
      address: z.string().optional(),
      emergency_contact_name: z.string().optional(),
      emergency_contact_phone: z.string().optional(),
      medical_conditions: z.string().optional(),
      allergies: z.string().optional(),
      blood_group: z.string().optional(),
    }),
  }),

  updateMember: z.object({
    body: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      full_name: z.string().min(2).optional(),
      status: z.enum(['active', 'expired', 'pending', 'cancelled']).optional(),
      membership_plan_id: z.string().uuid().nullable().optional(),
      assigned_trainer_id: z.string().uuid().nullable().optional(),
      end_date: z.string().optional(),
    }),
  }),

  updateTrainer: z.object({
    body: z.object({
      specialization: z.string().optional(),
      hire_date: z.string().optional(),
      salary: z.number().positive().optional(),
      is_active: z.boolean().optional(),
      schedule: z.any().optional(),
      qualifications: z.string().optional(),
    }),
  }),

  updatePlan: z.object({
    body: z.object({
      name: z.string().min(2).optional(),
      duration_days: z.number().positive().optional(),
      price: z.number().positive().optional(),
      discounted_price: z.number().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
      is_active: z.boolean().optional(),
    }),
  }),

  updateWorkout: z.object({
    body: z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      day_of_week: z.string().optional(),
      schedule_date: z.string().optional(),
      exercises: z.array(z.object({
        exercise_id: z.string().uuid().optional(),
        exercise_name: z.string().optional(),
        sets: z.number().positive().optional(),
        reps: z.string().optional(),
        weight_kg: z.number().optional(),
        notes: z.string().optional(),
      })).optional(),
      is_completed: z.boolean().optional(),
      notes: z.string().optional(),
    }),
  }),

  updateDiet: z.object({
    body: z.object({
      name: z.string().min(2).optional(),
      type: z.enum(['weight_loss', 'muscle_gain', 'maintenance']).optional(),
      target_calories: z.number().optional(),
      meals: z.array(z.object({
        meal: z.string(),
        time: z.string(),
        foods: z.array(z.string()),
        calories: z.number().optional(),
      })).optional(),
    }),
  }),

  createGym: z.object({
    body: z.object({
      name: z.string().min(2),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      logo_url: z.string().url().optional(),
    }),
  }),

  updateGym: z.object({
    body: z.object({
      name: z.string().min(2).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      logo_url: z.string().url().optional(),
      is_active: z.boolean().optional(),
    }),
  }),

  updateSettings: z.object({
    body: z.object({
      gym_name: z.string().optional(),
      default_membership_duration: z.number().optional(),
      enable_qr_attendance: z.boolean().optional(),
      enable_online_payments: z.boolean().optional(),
      notification_email: z.string().email().optional(),
      business_hours: z.any().optional(),
      holiday_dates: z.array(z.string()).optional(),
    }),
  }),

  register: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().min(2),
      phone: z.string().optional(),
      role: z.enum(['admin', 'trainer', 'member']).optional().default('member'),
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  }),

  createPlan: z.object({
    body: z.object({
      name: z.string().min(2),
      duration_days: z.number().positive(),
      price: z.number().positive(),
      discounted_price: z.number().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
    }),
  }),

  createTrainer: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().min(2),
      phone: z.string().optional(),
      specialization: z.string().optional(),
      salary: z.number().positive().optional(),
      qualifications: z.string().optional(),
    }),
  }),

  createDiet: z.object({
    body: z.object({
      member_id: z.string().uuid(),
      type: z.enum(['weight_loss', 'muscle_gain', 'maintenance']),
      target_calories: z.number().optional(),
      meals: z.array(z.object({
        meal: z.string(),
        time: z.string(),
        foods: z.array(z.string()),
        calories: z.number().optional(),
      })),
    }),
  }),

  createPayment: z.object({
    body: z.object({
      member_id: z.string().uuid(),
      amount: z.number().positive(),
      method: z.enum(['cash', 'card', 'razorpay', 'bank_transfer']),
      notes: z.string().optional(),
    }),
  }),

  addProgress: z.object({
    body: z.object({
      weight: z.number().positive(),
      bmi: z.number().positive().optional(),
      body_fat: z.number().optional(),
      chest_cm: z.number().optional(),
      waist_cm: z.number().optional(),
      arms_cm: z.number().optional(),
      notes: z.string().optional(),
    }),
  }),
};