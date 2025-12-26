'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    credits: 100,
    features: [
      '100 generation credits',
      'Text to Image',
      'Image to Image',
      'Basic support',
      'Standard quality',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    credits: 500,
    popular: true,
    features: [
      '500 generation credits',
      'All generation types',
      'Priority processing',
      'HD quality output',
      'Email support',
      'Commercial license',
    ],
  },
  {
    name: 'Enterprise',
    price: '$99',
    credits: 3000,
    features: [
      '3000 generation credits',
      'All generation types',
      'Fastest processing',
      '4K quality output',
      'Priority support',
      'API access',
      'Custom integrations',
    ],
  },
]

export default function Pricing() {
  return (
    <div className="py-24 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative p-8 bg-white rounded-2xl shadow-lg ${
                plan.popular ? 'ring-2 ring-indigo-600 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold text-indigo-600 mb-2">
                  {plan.price}
                  {plan.price !== 'Free' && (
                    <span className="text-lg text-gray-600">/month</span>
                  )}
                </div>
                <p className="text-gray-600">{plan.credits} credits</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full py-3 text-center rounded-lg font-semibold transition ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
