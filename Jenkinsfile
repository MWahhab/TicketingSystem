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
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ["/busybox/cat"]
    tty: true
    resources:
      requests:
        memory: "1Gi"  # Request enough RAM
        cpu: "500m"
    volumeMounts:
    - name: docker-config
      mountPath: /kaniko/.docker
  volumes:
  - name: docker-config
    secret:
      secretName: dockerhub-creds
      items:
      - key: .dockerconfigjson
        path: config.json
'''

pipeline {
    agent none
    
    environment {
        DOCKER_USER = 'deampuleadd'
        IMAGE_TAG = "${BUILD_NUMBER}" 
    }

    stages {
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
