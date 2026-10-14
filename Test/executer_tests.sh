#!/bin/bash
# Script Linux/macOS/WSL pour exécuter les tests unitaires de la réserve batterie Zendure

echo "============================================"
echo "Tests Unitaires - Réserve Batterie Zendure"
echo "============================================"
echo

# Vérifier si g++ est disponible
if command -v g++ &> /dev/null; then
    echo "Compilation avec g++..."
    g++ -std=c++11 -Wall -Wextra -pedantic -g -o test_reserve_batterie test_reserve_batterie.cpp

    if [ $? -eq 0 ]; then
        echo
        echo "Exécution des tests..."
        echo
        ./test_reserve_batterie
    else
        echo "Erreur : La compilation a échoué"
        exit 1
    fi
else
    echo "g++ non trouvé. Vérifiez que les outils de développement sont installés."
    echo "Sous Ubuntu/Debian : sudo apt-get install g++"
    echo "Sous Fedora/RHEL : sudo yum install gcc-c++"
    echo "Sous macOS : xcode-select --install"
    exit 1
fi

echo
echo "============================================"
echo "Tests terminés"
echo "============================================"