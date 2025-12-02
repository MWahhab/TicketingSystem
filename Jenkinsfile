def podYaml = '''
apiVersion: v1
kind: Pod
metadata:
  labels:
    app: jenkins-builder
spec:
  containers:
  - name: dependency-installer
    image: lorisleiva/laravel-docker:8.4
    command: ["cat"]
    tty: true
    resources:
      limits:
        memory: "2Gi"
        cpu: "2000m"
      requests:
        memory: "1Gi"
        cpu: "500m"
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

  - name: redis
    image: redis:alpine
    ports:
      - containerPort: 6379
    resources:
      limits:
        memory: "256Mi"
        cpu: "500m"
      requests:
        memory: "64Mi"
        cpu: "100m"
  # ----------------------------------
  - name: selenium
    image: selenium/standalone-chromium:latest
    ports:
      - containerPort: 4444
    volumeMounts:
      - name: dshm
        mountPath: /dev/shm
    resources:
      limits:
        memory: "2Gi"
        cpu: "2000m"
      requests:
        memory: "1Gi"
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
                    sh 'git config --global --add safe.directory "*"'

                    sh 'cp .env.example .env'

                    sh 'sed -i "s|^APP_URL=.*|APP_URL=http://127.0.0.1:8000|g" .env'
                    sh 'sed -i "s|^ASSET_URL=.*|ASSET_URL=http://127.0.0.1:8000|g" .env'
                    sh 'sed -i "s|^VITE_APP_URL=.*|VITE_APP_URL=http://127.0.0.1:8000|g" .env'

                    sh 'echo "APP_NAME=Laravel" >> .env'
                    sh 'echo "VITE_APP_NAME=Laravel" >> .env'
                    sh 'echo "REVERB_APP_KEY=dusk-test-key" >> .env'
                    sh 'echo "REVERB_HOST=127.0.0.1" >> .env'
                    sh 'echo "REVERB_PORT=8080" >> .env'
                    sh 'echo "REVERB_SCHEME=http" >> .env'
                    sh 'echo "VITE_REVERB_APP_KEY=dusk-test-key" >> .env'
                    sh 'echo "VITE_REVERB_HOST=127.0.0.1" >> .env'
                    sh 'echo "VITE_REVERB_PORT=8080" >> .env'
                    sh 'echo "VITE_REVERB_SCHEME=http" >> .env'

                    sh 'sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=mysql/" .env'
                    sh 'sed -i "s/^# DB_HOST=.*/DB_HOST=127.0.0.1/" .env'
                    sh 'sed -i "s/^# DB_PORT=.*/DB_PORT=3306/" .env'
                    sh 'sed -i "s/^# DB_DATABASE=.*/DB_DATABASE=laravel_testing/" .env'
                    sh 'sed -i "s/^# DB_USERNAME=.*/DB_USERNAME=root/" .env'
                    sh 'sed -i "s/^# DB_PASSWORD=.*/DB_PASSWORD=root/" .env'

                    sh 'sed -i "s|^REDIS_HOST=.*|REDIS_HOST=127.0.0.1|g" .env'
                    sh 'sed -i "s|^REDIS_PORT=.*|REDIS_PORT=6379|g" .env'
                    sh 'sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=null|g" .env'
                    // --------------------------

                    sh 'echo "DEBUGBAR_ENABLED=false" >> .env'
                    sh 'echo "APP_DEBUG=false" >> .env'
                    sh 'echo "LOG_CHANNEL=single" >> .env'

                    sh 'chmod -R 777 public'
                    sh 'chmod -R 777 storage bootstrap/cache'
                    sh 'touch storage/logs/laravel.log && chmod 777 storage/logs/laravel.log'

                    sh 'composer install --no-interaction --prefer-dist'
                    sh 'php artisan config:clear'

                    sh 'npm install'
                    sh 'npm run build'

                    sh 'chmod -R 777 public/build'

                    sh 'php artisan key:generate'
                    sh 'php artisan migrate --force'

                    sh 'php artisan test'

                    sh 'APP_URL=http://127.0.0.1:8000 php artisan serve --host=0.0.0.0 --port=8000 > serve.log 2>&1 &'

                    sh 'sleep 10'
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
                        --destination ${DOCKER_USER}/base:latest \
                        --destination ${DOCKER_USER}/base:k8s
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

                    sh 'git config --global --add safe.directory "*"'

                    sh 'composer install --no-interaction --prefer-dist --optimize-autoloader'

                    sh 'npm install'
                    sh 'npm run build'
                }

                container('kaniko') {
                    echo "Building App..."
                    // IMPORTANT: We pass build-arg BASE_IMAGE here to link to the base we just built
                    sh """
                    /kaniko/executor --context `pwd` \
                        --dockerfile `pwd`/buildDeployFiles/app/Dockerfile \
                        --build-arg BASE_IMAGE=${DOCKER_USER}/base:${IMAGE_TAG} \
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
