// RizeCoop removed for this build — original screen kept below, commented out.
// Stub default export so expo-router doesn't warn about a route with no component.
export default function RizeCoopRemoved() {
  return null;
}

// // screens/RizeCoop.jsx
// import React from 'react';
// import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
// import Header from 'components/header';
// import { navigateBack, navigateTo } from 'app/navigate';
//
// export default function RizeCoop() {
//   const handleCollateralLoanSavings = () => {
//     console.log('Collateral Loan Savings pressed');
//     navigateTo('collateralSavingData');
//   };
//
//   const handleRizeCoopLoan = () => {
//     console.log('RizeCoop Loan pressed');
//     navigateTo('rizeCoopLoanData');
//   };
//
//   return (
//     <View className="flex-1 bg-white">
//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{ flexGrow: 1 }}
//         showsVerticalScrollIndicator={false}>
//         <Header title="RizeCoop" onLeftPress={navigateBack} showLeftIcon={true} color="black" />
//
//         <View className="flex-1 px-4 pt-6">
//           {/* Row of Cards */}
//           <View className="flex-row justify-between">
//             {/* Collateral Loan Savings Card */}
//             <TouchableOpacity
//               onPress={handleCollateralLoanSavings}
//               className="w-[48%] rounded-2xl border-2 border-blue-200 bg-blue-50 p-4"
//               activeOpacity={0.8}>
//               <View className="mb-3 self-start rounded-full bg-blue-500 px-3 py-1">
//                 <Text className="text-xs font-semibold text-white">Collateral Loan Savings</Text>
//               </View>
//               <Text className="mb-1 text-base font-bold text-gray-900">Save Contribution</Text>
//               <Text className="text-xs text-gray-600">Save towards your loan with ease</Text>
//             </TouchableOpacity>
//
//             {/* RizeCoop Loan Card */}
//             <TouchableOpacity
//               onPress={handleRizeCoopLoan}
//               className="w-[48%] rounded-2xl border-2 border-pink-200 bg-pink-50 p-4"
//               activeOpacity={0.8}>
//               <View className="mb-3 self-start rounded-full bg-pink-500 px-3 py-1">
//                 <Text className="text-xs font-semibold text-white">X2 of Locked Funds!!</Text>
//               </View>
//               <Text className="mb-1 text-base font-bold text-gray-900">RizeCoop Loan</Text>
//               <Text className="text-xs text-gray-600">Low interest loans</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }
