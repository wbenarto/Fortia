import { View, Text, StyleSheet, Platform } from "react-native";

const Home = () => {
    console.log('hello')

    if (Platform.OS === 'ios') {
        console.log('ios console here')
    }
    return (
        <View style={styles.container}>
            <Text>
                Welcome back, Rodri
                hahahah
            </Text>
        </View>
    ) 
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'lightblue',
        marginTop: 20,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20
    }
})

export default Home;