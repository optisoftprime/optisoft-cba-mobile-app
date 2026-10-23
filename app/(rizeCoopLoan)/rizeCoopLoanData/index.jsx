// RizeCoop removed for this build — original screen kept below, commented out.
// Stub default export so expo-router doesn't warn about a route with no component.
export default function RizeCoopRemoved() {
  return null;
}

// // screens/RizeCoopLoanInfo.jsx
// import React from 'react';
// import { View, Text, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
// import { navigateTo } from 'app/navigate';
// import TouchBtn from 'components/touchBtn';
//
// export default function RizeCoopLoanInfo() {
//   const handleApplyForLoan = () => {
//     console.log('Apply For Loan pressed');
//     navigateTo('rizeCoopLoanForm');
//   };
//
//   return (
//     <View className="flex-1" style={{ backgroundColor: '#566D24' }}>
//       <StatusBar barStyle="light-content" />
//
//       <ScrollView className="mt-5 flex-1 px-4 pt-12">
//         {/* Hero Image Card */}
//         <View className="mb-6 overflow-hidden rounded-3xl bg-white">
//           <Image
//             source={require('../../../assets/savings-hero.png')}
//             style={{ width: '100%', height: 180 }}
//             resizeMode="cover"
//           />
//         </View>
//
//         {/* Title */}
//         <Text className="mb-2 text-3xl font-bold text-white">
//           Get Quick Access To Funds{'\n'}When You Need It
//         </Text>
//
//         {/* Benefits/Features Section */}
//         <View className="mb-6">
//           <Text className="mb-3 text-base font-bold text-white">Benefits/Features</Text>
//           <View className="space-y-2">
//             <View className="flex-row items-start">
//               <Text className="mr-2 text-white">•</Text>
//               <Text className="flex-1 text-sm leading-6 text-white">
//                 Fast and simple loan application
//               </Text>
//             </View>
//             <View className="flex-row items-start">
//               <Text className="mr-2 text-white">•</Text>
//               <Text className="flex-1 text-sm leading-6 text-white">
//                 Flexible repayment duration
//               </Text>
//             </View>
//             <View className="flex-row items-start">
//               <Text className="mr-2 text-white">•</Text>
//               <Text className="flex-1 text-sm leading-6 text-white">
//                 Auto credit score assessment
//               </Text>
//             </View>
//             <View className="flex-row items-start">
//               <Text className="mr-2 text-white">•</Text>
//               <Text className="flex-1 text-sm leading-6 text-white">No long paper work</Text>
//             </View>
//           </View>
//         </View>
//
//         {/* Interest/Rewards Section */}
//         <View className="mb-8">
//           <Text className="mb-3 text-base font-bold text-white">Interest/Rewards</Text>
//           <View className="space-y-2">
//             <View className="flex-row items-start">
//               <Text className="mr-2 text-white">•</Text>
//               <Text className="flex-1 text-sm leading-6 text-white">
//                 Competitive rate based on your credit score
//               </Text>
//             </View>
//             <View className="flex-row items-start">
//               <Text className="mr-2 text-white">•</Text>
//               <Text className="flex-1 text-sm leading-6 text-white">
//                 Earn point for on time repayment
//               </Text>
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//
//       {/* Apply For Loan Button - Fixed at bottom */}
//       <View className="px-4 pb-8 pt-4">
//         <TouchBtn
//           onPress={handleApplyForLoan}
//           label="Apply For Loan"
//           backgroundColor="white"
//           textColor="#6B7A3E" // olive green color
//           textClassName="text-base font-bold"
//           buttonClassName="w-full items-center rounded-lg py-4"
//           containerClassName=""
//         />
//       </View>
//     </View>
//   );
// }
