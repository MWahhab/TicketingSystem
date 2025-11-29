def podYaml = '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-builder
spec:
  containers:
  - name: dependency-installer
    image: lorisleiva/laravel-docker:8.2
    command: ["cat"]
    tty: true
    env:
      - name: DB_CONNECTION
        value: mysql
      - name: DB_HOST
        value: 127.0.0.1
      - name: DB_PORT
        value: "3306"
      - name: DB_DATABASE
        value: laravel_testing
      - name: DB_USERNAME
        value: root
      - name: DB_PASSWORD
        value: root
      - name: APP_URL
        value: http://127.0.0.1:8000
      # THIS TELLS LARAVEL TO USE THE SELENIUM CONTAINER
      - name: DUSK_DRIVER_URL
        value: http://127.0.0.1:4444/wd/hub
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ["/busybox/cat"]
    tty: true
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
    volumeMounts:
    - name: docker-config
      mountPath: /kaniko/.docker
  - name: mysql
    image: mariadb:10.6
    args:
      - "--max_connections=200"
      - "--innodb_buffer_pool_size=64M"
    env:
      - name: MARIADB_ROOT_PASSWORD
        value: root
      - name: MARIADB_DATABASE
        value: laravel_testing
    resources:
      limits:
        memory: "512Mi"
      requests:
        memory: "256Mi"
    ports:
      - containerPort: 3306
  - name: selenium
    image: selenium/standalone-chromium:latest
    ports:
      - containerPort: 4444
    volumeMounts:
      - name: dshm
        mountPath: /dev/shm
    resources:
      limits:
        memory: "1Gi"
        cpu: "1000m"
      requests:
        memory: "512Mi"
        cpu: "500m"
  volumes:
  - name: docker-config
    secret:
      secretName: dockerhub-creds
      items:
      - key: .dockerconfigjson
        path: config.json
  - name: dshm
    emptyDir:
      medium: Memory
'''

pipeline {
    agent none
    
    environment {
        DOCKER_USER = 'deampuleadd'
        IMAGE_TAG = "${BUILD_NUMBER}" 
    }

    stages {
        stage('Run Tests') {
            agent {
                kubernetes { yaml podYaml }
            }
            steps {
                git branch: 'master', credentialsId: '3a91b7f3-dddb-445f-a990-45a1491485c1', url: 'https://github.com/lolmeherti/TicketingSystem.git'
                
                container('dependency-installer') {
                    sh 'cp .env.example .env'
                    sh 'composer install --no-interaction --prefer-dist'
                    
                    sh 'npm install'
                    sh 'npm run build'
                    
                    sh 'php artisan key:generate'
                    sh 'sleep 10'
                    sh 'php artisan migrate --force'
                    
                    sh 'php artisan test'
                    
                    sh 'php artisan serve --host=0.0.0.0 --port=8000 & > /dev/null 2>&1'
                    sh 'sleep 5' 
                    sh 'php artisan dusk'
                }
            }
        }

        stage('Build Base') {
            agent {
                kubernetes { yaml podYaml }
            }
            steps {
                git branch: 'master', credentialsId: '3a91b7f3-dddb-445f-a990-45a1491485c1', url: 'https://github.com/lolmeherti/TicketingSystem.git'
                
                container('kaniko') {
                    echo "Building Base..."
                    sh """
                    /kaniko/executor --context `pwd` \
                        --dockerfile `pwd`/buildDeployFiles/base/Dockerfile \
                        --cache=false \
                        --single-snapshot \
                        --destination ${DOCKER_USER}/base:${IMAGE_TAG} \
                        --destination ${DOCKER_USER}/base:latest
                    """
                }
            }
        }

        stage('Build App') {
            agent {
                kubernetes { yaml podYaml }
            }
            steps {
                git branch: 'master', credentialsId: '3a91b7f3-dddb-445f-a990-45a1491485c1', url: 'https://github.com/lolmeherti/TicketingSystem.git'
                container('dependency-installer') {
                    echo "Injecting .env..."
                    withCredentials([file(credentialsId: 'prod-env-file', variable: 'ENV_FILE')]) {
                        sh 'cp $ENV_FILE .env'
                    }
                    echo "Compiling Assets..."
                    sh 'composer install --no-interaction --prefer-dist --optimize-autoloader'
                    sh 'npm install'
                    sh 'npm run build'
                }

                container('kaniko') {
                    echo "Building App..."
                    sh """
                    /kaniko/executor --context `pwd` \
                        --dockerfile `pwd`/buildDeployFiles/app/Dockerfile \
                        --cache=false \
                        --single-snapshot \
                        --destination ${DOCKER_USER}/app:${IMAGE_TAG} \
                        --destination ${DOCKER_USER}/app:latest \
                        --destination ${DOCKER_USER}/app:k8s
                    """
                }
            }
        }
        stage('Build Nginx') {
            agent {
                kubernetes { yaml podYaml }
            }
            steps {
                git branch: 'master', credentialsId: '3a91b7f3-dddb-445f-a990-45a1491485c1', url: 'https://github.com/lolmeherti/TicketingSystem.git'
                
                container('kaniko') {
                    echo "Building Nginx..."
                    sh """
                    /kaniko/executor --context `pwd` \
                        --dockerfile `pwd`/buildDeployFiles/nginx/Dockerfile \
                        --cache=false \
                        --single-snapshot \
                        --destination ${DOCKER_USER}/nginx:${IMAGE_TAG} \
                        --destination ${DOCKER_USER}/nginx:latest
                    """
                }
            }
        }
        stage('Build n8n') {
            agent {
                kubernetes { yaml podYaml }
            }
            steps {
                git branch: 'master', credentialsId: '3a91b7f3-dddb-445f-a990-45a1491485c1', url: 'https://github.com/lolmeherti/TicketingSystem.git'
                
                container('kaniko') {
                    echo "Building n8n..."
                    sh """
                    /kaniko/executor --context `pwd` \
                        --dockerfile `pwd`/buildDeployFiles/n8n/Dockerfile \
                        --cache=false \
                        --single-snapshot \
                        --ignore-path=/usr/local/lib/node_modules \
                        --destination ${DOCKER_USER}/n8n:${IMAGE_TAG} \
                        --destination ${DOCKER_USER}/n8n:latest
                    """
                }
            }
        }
    }
}
